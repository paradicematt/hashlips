const basePath = process.cwd();
const { MODE } = require(`${basePath}/constants/blend_mode.js`);
const { NETWORK } = require(`${basePath}/constants/network.js`);

const network = NETWORK.eth;

// General metadata for Ethereum
const namePrefix = "Critters Master Edition";
const description = "Critters Quest";
const baseUri = "";

const solanaMetadata = {
  symbol: "CC",
  seller_fee_basis_points: 500, // Define how much % you want from secondary market sales 1000 = 10%
  external_url: "https://critters.quest",
  creators: [
    {
      address: "7fXNuer5sbZtaTEPhtJ5g5gNtuyRoKkvxdjEjEnPN4mC",
      share: 100,
    },
  ],
  collection: {
    name: "Critter",
    family: "Critters Quest",
  },
};

// Layer configurations with ranges for attributes and SLOT as a boolean
const layerConfigurations = [
  {
    growEditionSizeTo: 100,
    layersOrder: [
      { name: "Background" },
      { name: "Critters" },
      { name: "Hats", attributes: { DEF: [0, 10], HP: [0, 25], MA: [0, 15], CC:[0, 5], SLOT: 'boolean' } },
      { name: "Weapons", attributes: { ATK: [7, 23], DEF: [0, 10], HP: [0, 25], MA: [0, 15], CC:[0, 5], CD:[10, 25], SLOT: 'boolean' } },
      { name: "Skill Bar", },
      { name: "ATK", options: { bypassDNA: true } },
      { name: "DEF", options: { bypassDNA: true } },
      { name: "HP", options: { bypassDNA: true } },
      { name: "MA", options: { bypassDNA: true } },
      { name: "CC", options: { bypassDNA: true } },
      { name: "CD", options: { bypassDNA: true } },
    ],
  },
];

const shuffleLayerConfigurations = false;

const debugLogs = false;

const format = {
  width: 512,
  height: 512,
  smoothing: false,
};

const gif = {
  export: false,
  repeat: 0,
  quality: 100,
  delay: 500,
};

const text = {
  only: false,
  color: "#ffffff",
  size: 20,
  xGap: 40,
  yGap: 40,
  align: "left",
  baseline: "top",
  weight: "regular",
  family: "Courier",
  spacer: " => ",
};

const pixelFormat = {
  ratio: 2 / 128,
};

const background = {
  generate: true,
  brightness: "80%",
  static: false,
  default: "#000000",
};

const extraMetadata = {};

const rarityDelimiter = "#";

const uniqueDnaTorrance = 10000;

const preview = {
  thumbPerRow: 5,
  thumbWidth: 50,
  imageRatio: format.height / format.width,
  imageName: "preview.png",
};

const preview_gif = {
  numberOfImages: 5,
  order: "ASC", // ASC, DESC, MIXED
  repeat: 0,
  quality: 100,
  delay: 500,
  imageName: "preview.gif",
};

// Function to generate random attribute values based on range and boolean
const generateRandomAttributes = (layerAttributes) => {
  let attributes = {};
  for (let [key, value] of Object.entries(layerAttributes)) {
    if (value === 'boolean') {
      // Assign boolean attribute as true or false randomly
      attributes[key] = Math.random() < 0.5 ? 'TRUE' : 'FALSE';
    } else if (Array.isArray(value)) {
      // Range-based attribute: Generate a value within the range
      const [min, max] = value;
      const rangeValue = Math.floor(Math.random() * (max - min + 1)) + min;
      attributes[key] = rangeValue; // Use the generated range value
    }
  }
  return attributes;
};



// Function to format the metadata value with dynamic attributes
const formatAttributes = (baseValue, attributes) => {
  let attributesString = Object.entries(attributes)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');

  return `${baseValue}{${attributesString}}`;
};

// Function to create metadata with dynamic attributes appended to the value
const createMetadata = (layer, baseMetadata) => {
  const layerAttributes = layer.attributes || {};
  const dynamicAttributes = generateRandomAttributes(layerAttributes);

  let updatedAttributes = baseMetadata.attributes.map((attr) => {
    if (layer.attributes && attr.trait_type in layer.attributes) {
      attr.value = formatAttributes(attr.value, dynamicAttributes);
    }
    return attr;
  });

  const fullMetadata = {
    ...baseMetadata,
    attributes: updatedAttributes,
  };

  return fullMetadata;
};

module.exports = {
  format,
  baseUri,
  description,
  background,
  uniqueDnaTorrance,
  layerConfigurations,
  rarityDelimiter,
  preview,
  shuffleLayerConfigurations,
  debugLogs,
  extraMetadata,
  pixelFormat,
  text,
  namePrefix,
  network,
  solanaMetadata,
  gif,
  preview_gif,
  createMetadata, // Export createMetadata function
};
