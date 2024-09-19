const basePath = process.cwd();
const { NETWORK } = require(`${basePath}/constants/network.js`);
const fs = require("fs");
const sha1 = require(`${basePath}/node_modules/sha1`);
const { createCanvas, loadImage } = require(`${basePath}/node_modules/canvas`);
const buildDir = `${basePath}/build`;
const layersDir = `${basePath}/layers`;
const {
  format,
  baseUri,
  description,
  background,
  uniqueDnaTorrance,
  layerConfigurations,
  rarityDelimiter,
  shuffleLayerConfigurations,
  debugLogs,
  extraMetadata,
  text,
  namePrefix,
  network,
  solanaMetadata,
  gif,
} = require(`${basePath}/src/config.js`);
const canvas = createCanvas(format.width, format.height);
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = format.smoothing;
var metadataList = [];
var attributesList = [];
var dnaList = new Set();
const DNA_DELIMITER = "-";
const HashlipsGiffer = require(`${basePath}/modules/HashlipsGiffer.js`);
const _editionCount = 1
let hashlipsGiffer = null;

const buildSetup = () => {
  if (fs.existsSync(buildDir)) {
    fs.rmdirSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir);
  fs.mkdirSync(`${buildDir}/json`);
  fs.mkdirSync(`${buildDir}/images`);
  if (gif.export) {
    fs.mkdirSync(`${buildDir}/gifs`);
  }
};

const getRarityWeight = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4);
  var nameWithoutWeight = Number(
    nameWithoutExtension.split(rarityDelimiter).pop()
  );
  if (isNaN(nameWithoutWeight)) {
    nameWithoutWeight = 1;
  }
  return nameWithoutWeight;
};

const cleanDna = (_str) => {
  const withoutOptions = removeQueryStrings(_str);
  var dna = Number(withoutOptions.split(":").shift());
  return dna;
};

const cleanName = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4);
  var nameWithoutWeight = nameWithoutExtension.split(rarityDelimiter).shift();
  return nameWithoutWeight;
};

const getElements = (path) => {
  const supportedFormats = ['.png', '.jpg', '.jpeg']; // List of supported image formats

  return fs
    .readdirSync(path)
    .filter((item) => {
      // Check if the item has a valid image extension
      const ext = item.slice(item.lastIndexOf('.')).toLowerCase();
      return supportedFormats.includes(ext) && !/(^|\/)\.[^\/\.]/g.test(item);
    })
    .map((i, index) => {
      if (i.includes("-")) {
        throw new Error(`Layer name cannot contain dashes, please fix: ${i}`);
      }

      // Extract the base name from the filename before any attribute triggers
      const baseName = cleanName(i).split('=')[0].trim();

      // Initialize attributes object
      const attributes = {};

      // Detect all attribute triggers in the filename
      const attributeTriggers = i.match(/=(ATK|CC|CD|DEF|HP|MA|SLOT)/g); // Adjust this list as needed
      if (attributeTriggers) {
        attributeTriggers.forEach((trigger) => {
          const key = trigger.substring(1); // Remove the "=" from the trigger
          attributes[key] = true; // Mark that this attribute needs dynamic generation
        });
      }

      // Match any rarity weight from the filename
      const weightMatch = i.match(/#(\d+)/);
      const rarityWeight = weightMatch ? parseInt(weightMatch[1], 10) : 1;

      return {
        id: index,
        name: baseName,
        filename: i,
        path: `${path}/${i}`,
        weight: rarityWeight,
        attributes,
      };
    });
};









const layersSetup = (layersOrder) => {
  const layers = layersOrder.map((layerObj, index) => ({
    id: index,
    elements: getElements(`${layersDir}/${layerObj.name}/`),
    name:
      layerObj.options?.["displayName"] != undefined
        ? layerObj.options?.["displayName"]
        : layerObj.name,
    blend:
      layerObj.options?.["blend"] != undefined
        ? layerObj.options?.["blend"]
        : "source-over",
    opacity:
      layerObj.options?.["opacity"] != undefined
        ? layerObj.options?.["opacity"]
        : 1,
    bypassDNA:
      layerObj.options?.["bypassDNA"] !== undefined
        ? layerObj.options?.["bypassDNA"]
        : false,
  }));
  return layers;
};

const saveImage = (_editionCount) => {
  fs.writeFileSync(
    `${buildDir}/images/${_editionCount}.png`,
    canvas.toBuffer("image/png")
  );
};

const genColor = () => {
  let hue = Math.floor(Math.random() * 360);
  let pastel = `hsl(${hue}, 100%, ${background.brightness})`;
  return pastel;
};

const drawBackground = () => {
  ctx.fillStyle = background.static ? background.default : genColor();
  ctx.fillRect(0, 0, format.width, format.height);
};

const addMetadata = (_dna, _edition) => {
  let dateTime = Date.now();
  let tempMetadata = {
    name: `${namePrefix} #${_edition + 1}`,
    description: description,
    image: `${_edition}.png`,
    properties: {
      files: [
        {
          uri: `${_edition}.png`,
          type: "image/png"
        }
      ]
    },
    // dna: sha1(_dna),
    edition: _edition,
    date: dateTime,
    ...extraMetadata,
    attributes: attributesList,
    // compiler: "HashLips Art Engine",
  };
  if (network == NETWORK.sol) {
    tempMetadata = {
      //Added metadata for solana
      name: tempMetadata.name,
      symbol: solanaMetadata.symbol,
      description: tempMetadata.description,
      //Added metadata for solana
      seller_fee_basis_points: solanaMetadata.seller_fee_basis_points,
      image: `${_edition}.png`,
      //Added metadata for solana
      external_url: solanaMetadata.external_url,
      edition: _edition,
      ...extraMetadata,
      attributes: tempMetadata.attributes,
      properties: {
        files: [
          {
            uri: `${_edition}.png`,
            type: "image/png",
          },
        ],
        category: "image",
        creators: solanaMetadata.creators,
      },
    };
  }
  metadataList.push(tempMetadata);
  attributesList = [];
};

const addAttributes = (_element) => {
  let selectedElement = _element.layer.selectedElement;

  // Log the element layer being processed
  // console.log(`Processing element: ${_element.layer.name}`);

  // Initialize attributes to generate based on the parsed filename
  let attributesToGenerate = {}; // This will store all generated attributes

  // Ensure the attributes object is initialized correctly
  if (selectedElement.attributes) {
    Object.entries(selectedElement.attributes).forEach(([key, value]) => {
      if (value !== undefined) { // Check for undefined instead of falsy values
        const layerConfig = layerConfigurations[0].layersOrder.find(
          (layer) => layer.name === _element.layer.name
        );

        if (layerConfig && layerConfig.attributes && layerConfig.attributes[key]) {
          const range = layerConfig.attributes[key];

          // Log the range or type being used for the attribute
          // console.log(`Generating value for attribute ${key} with range/type: ${range}`);

          // Find all occurrences of the attribute trigger in the filename
          const occurrences = (selectedElement.filename.match(new RegExp(`=${key}`, "g")) || []).length;
          
          let totalValue = 0; // Initialize total value for attributes that need to be summed

          for (let i = 0; i < occurrences; i++) {
            let generatedValue;

            // Generate a random value based on the range or type
            if (Array.isArray(range)) {
              generatedValue = Math.floor(Math.random() * (range[1] - range[0] + 1) + range[0]);
            } else if (typeof range === 'string' && range === 'boolean') {
              generatedValue = Math.random() < 0.5 ? true : false;
            }

            // If the key needs summing (appears more than once), add the value to totalValue
            if (occurrences > 1) {
              totalValue += generatedValue; // Accumulate values
            } else {
              // Normal case for single occurrence
              attributesToGenerate[key] = generatedValue;
            }

            // console.log(`Generated ${key} value: ${generatedValue}`); // Log each generated value 
          }

          // If the attribute appeared more than once, set the final total value
          if (occurrences > 1) {
            attributesToGenerate[key] = totalValue;
            // console.log(`Total value for multiple ${key}: ${totalValue}`); // Log total
          }

        } else {
          // console.warn(`No configuration found for attribute ${key}`);
        }
      }
    });
  } else {
    // console.warn(`No attributes detected in element: ${selectedElement.name}`);
  }

  // Filter out attributes with value 0
  attributesToGenerate = Object.fromEntries(
    Object.entries(attributesToGenerate).filter(([_, value]) => value !== 0 && value !== false)
  );

  // Log the generated attributes before constructing the dynamic string
  // console.log(`Generated attributes: ${JSON.stringify(attributesToGenerate)}`);

  // Construct a string with dynamic attributes from the parsed attributes in the filename
  let dynamicAttributesString = Object.entries(attributesToGenerate)
    .map(([key, value]) => `${key}:${value}`)
    .join(',');

  // Clear previously generated attributes to avoid accumulation
  attributesToGenerate = {};

  // Reset the name with the base name (remove any previous dynamic attributes)
  const baseName = selectedElement.filename.split('=')[0].trim(); 

  // Append the dynamic attributes string to the base name if they exist
  if (dynamicAttributesString) {
    selectedElement.name = `${baseName}{${dynamicAttributesString}}`; // Use the baseName correctly
  }

  // Log the final name after adding attributes
  // console.log(`Final element name: ${selectedElement.name}`);

  attributesList.push({
    trait_type: _element.layer.name,
    value: selectedElement.name,
  });

  // Log the final attribute added to the attributes list
  // console.log(`Final attribute added: ${JSON.stringify(attributesList[attributesList.length - 1])}`);
};





// Function to generate a random value within a specified range
const generateRandomAttributeValue = (range) => {
  if (Array.isArray(range) && range.length === 2) {
    const [min, max] = range;
    const generatedValue = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`Generated random value within range ${min}-${max}: ${generatedValue}`); // Debug log
    return generatedValue;
  }
  console.warn(`Invalid range provided for attribute generation: ${range}`); // Warning log
  return null;
};



const loadLayerImg = async (_layer) => {
  try {
    return new Promise(async (resolve, reject) => {
      const image = await loadImage(`${_layer.selectedElement.path}`);
      resolve({ layer: _layer, loadedImage: image });
    });
  } catch (error) {
    console.error(`Error loading image for layer ${_layer.layer.name}: ${_layer.selectedElement.path}`, error);
    throw error; // Re-throw the error to catch it in the calling function
  }
};


const addText = (_sig, x, y, size) => {
  ctx.fillStyle = text.color;
  ctx.font = `${text.weight} ${size}pt ${text.family}`;
  ctx.textBaseline = text.baseline;
  ctx.textAlign = text.align;
  ctx.fillText(_sig, x, y);
};

const drawElement = (_renderObject, _index, _layersLen) => {
  ctx.globalAlpha = _renderObject.layer.opacity;
  ctx.globalCompositeOperation = _renderObject.layer.blend;
  text.only
    ? addText(
        `${_renderObject.layer.name}${text.spacer}${_renderObject.layer.selectedElement.name}`,
        text.xGap,
        text.yGap * (_index + 1),
        text.size
      )
    : ctx.drawImage(
        _renderObject.loadedImage,
        0,
        0,
        format.width,
        format.height
      );

  addAttributes(_renderObject);
};

const constructLayerToDna = (_dna = "", _layers = []) => {
  let mappedDnaToLayers = _layers.map((layer, index) => {
    let selectedElement = layer.elements.find(
      (e) => e.id == cleanDna(_dna.split(DNA_DELIMITER)[index])
    );
    return {
      name: layer.name,
      blend: layer.blend,
      opacity: layer.opacity,
      selectedElement: selectedElement,
    };
  });
  return mappedDnaToLayers;
};

/**
 * In some cases a DNA string may contain optional query parameters for options
 * such as bypassing the DNA isUnique check, this function filters out those
 * items without modifying the stored DNA.
 *
 * @param {String} _dna New DNA string
 * @returns new DNA string with any items that should be filtered, removed.
 */
const filterDNAOptions = (_dna) => {
  const dnaItems = _dna.split(DNA_DELIMITER);
  const filteredDNA = dnaItems.filter((element) => {
    const query = /(\?.*$)/;
    const querystring = query.exec(element);
    if (!querystring) {
      return true;
    }
    const options = querystring[1].split("&").reduce((r, setting) => {
      const keyPairs = setting.split("=");
      return { ...r, [keyPairs[0]]: keyPairs[1] };
    }, []);

    return options.bypassDNA;
  });

  return filteredDNA.join(DNA_DELIMITER);
};

/**
 * Cleaning function for DNA strings. When DNA strings include an option, it
 * is added to the filename with a ?setting=value query string. It needs to be
 * removed to properly access the file name before Drawing.
 *
 * @param {String} _dna The entire newDNA string
 * @returns Cleaned DNA string without querystring parameters.
 */
const removeQueryStrings = (_dna) => {
  const query = /(\?.*$)/;
  return _dna.replace(query, "");
};

const isDnaUnique = (_DnaList = new Set(), _dna = "") => {
  const _filteredDNA = filterDNAOptions(_dna);
  return !_DnaList.has(_filteredDNA);
};

const createDna = (_layers) => {
  let randNum = [];
  _layers.forEach((layer) => {
    var totalWeight = 0;
    layer.elements.forEach((element) => {
      totalWeight += element.weight;
    });
    // number between 0 - totalWeight
    let random = Math.floor(Math.random() * totalWeight);
    for (var i = 0; i < layer.elements.length; i++) {
      // subtract the current weight from the random weight until we reach a sub zero value.
      random -= layer.elements[i].weight;
      if (random < 0) {
        return randNum.push(
          `${layer.elements[i].id}:${layer.elements[i].filename}${
            layer.bypassDNA ? "?bypassDNA=true" : ""
          }`
        );
      }
    }
  });
  return randNum.join(DNA_DELIMITER);
};

const writeMetaData = (_data) => {
  fs.writeFileSync(`${buildDir}/json/_metadata.json`, _data);
};

const saveMetaDataSingleFile = (_editionCount ) => {
  let metadata = metadataList.find((meta) => meta.edition == _editionCount);
  debugLogs
    ? console.log(
        `Writing metadata for ${_editionCount}: ${JSON.stringify(metadata)}`
      )
    : null;
  fs.writeFileSync(
    `${buildDir}/json/${_editionCount}.json`,
    JSON.stringify(metadata, null, 2)
  );
};

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

const startCreating = async () => {
  let layerConfigIndex = 0;
  let editionCount = 0;
  let failedCount = 0;
  let abstractedIndexes = [];
  for (
    let i = network == NETWORK.sol ? 0 : 0;
    i <= layerConfigurations[layerConfigurations.length - 1].growEditionSizeTo;
    i++
  ) {
    abstractedIndexes.push(i);
  }
  if (shuffleLayerConfigurations) {
    abstractedIndexes = shuffle(abstractedIndexes);
  }
  debugLogs
    ? console.log("Editions left to create: ", abstractedIndexes)
    : null;
  while (layerConfigIndex < layerConfigurations.length) {
    const layers = layersSetup(
      layerConfigurations[layerConfigIndex].layersOrder
    );
    while (
      editionCount <= layerConfigurations[layerConfigIndex].growEditionSizeTo
    ) {
      let newDna = createDna(layers);
      if (isDnaUnique(dnaList, newDna)) {
        let results = constructLayerToDna(newDna, layers);
        let loadedElements = [];

        results.forEach((layer) => {
          loadedElements.push(loadLayerImg(layer));
        });

        await Promise.all(loadedElements).then((renderObjectArray) => {
          debugLogs ? console.log("Clearing canvas") : null;
          ctx.clearRect(0, 0, format.width, format.height);
          if (gif.export) {
            hashlipsGiffer = new HashlipsGiffer(
              canvas,
              ctx,
              `${buildDir}/gifs/${abstractedIndexes[0]}.gif`,
              gif.repeat,
              gif.quality,
              gif.delay
            );
            hashlipsGiffer.start();
          }
          if (background.generate) {
            drawBackground();
          }
          renderObjectArray.forEach((renderObject, index) => {
            drawElement(
              renderObject,
              index,
              layerConfigurations[layerConfigIndex].layersOrder.length
            );
            if (gif.export) {
              hashlipsGiffer.add();
            }
          });
          if (gif.export) {
            hashlipsGiffer.stop();
          }
          debugLogs
            ? console.log("Editions left to create: ", abstractedIndexes)
            : null;
          saveImage(abstractedIndexes[0]);
          addMetadata(newDna, abstractedIndexes[0]);
          saveMetaDataSingleFile(abstractedIndexes[0]);
          console.log(
            `Created edition: ${abstractedIndexes[0]}, with DNA: ${sha1(
              newDna
            )}`
          );
        });
        dnaList.add(filterDNAOptions(newDna));
        editionCount++;
        abstractedIndexes.shift();
      } else {
        console.log("DNA exists!");
        failedCount++;
        if (failedCount >= uniqueDnaTorrance) {
          console.log(
            `You need more layers or elements to grow your edition to ${layerConfigurations[layerConfigIndex].growEditionSizeTo} artworks!`
          );
          process.exit();
        }
      }
    }
    layerConfigIndex++;
  }
  writeMetaData(JSON.stringify(metadataList, null, 2));
};

module.exports = { startCreating, buildSetup, getElements };
