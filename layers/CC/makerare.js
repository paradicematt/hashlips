const fs = require('fs');

// Function to extract the base number from the file name
function extractBaseNumber(fileName) {
  const match = fileName.match(/^(\d+)(#\d+)?\.PNG$/i);
  return match ? parseInt(match[1], 10) : null;
}

// Read all files in the current directory
fs.readdir('.', (err, files) => {
  if (err) {
    console.error('Error reading the directory:', err);
    return;
  }

  // Filter files to include only PNGs with numeric names
  const pngFiles = files.filter(file => extractBaseNumber(file) !== null);
  if (pngFiles.length === 0) {
    console.log('No valid PNG files with numeric names found.');
    return;
  }

  // Extract and sort base numbers
  const baseNumbers = pngFiles.map(extractBaseNumber).sort((a, b) => a - b);

  const totalFiles = baseNumbers.length;
  const steps = [10, 30, 40, 60, 60, 35, 30, 25, 20, 10]; // Define the desired steps pattern
  const segmentSize = Math.ceil(totalFiles / steps.length); // Determine the size of each segment

  pngFiles.forEach((file, index) => {
    const baseNumber = extractBaseNumber(file);
    if (baseNumber === null) return;

    // Determine the step index based on file position
    const stepIndex = Math.floor(index / segmentSize);
    const percentageStep = steps[stepIndex];

    // Create the new file name
    const newFileName = `${baseNumber}#${percentageStep}.PNG`;

    // Rename the file if needed
    if (file !== newFileName) {
      fs.rename(file, newFileName, err => {
        if (err) {
          console.error(`Error renaming file ${file}:`, err);
        } else {
          console.log(`Renamed: ${file} -> ${newFileName}`);
        }
      });
    }
  });
});
