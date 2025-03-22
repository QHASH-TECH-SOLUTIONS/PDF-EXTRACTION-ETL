const fs = require('fs');
const pdf = require('pdf-parse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Path to the input PDF file
const inputPdfPath = '/home/red-virus/Desktop/office/QHash/Running_Projects/pdf_Extractor/pdfs/sample5.pdf';
// Path to the output CSV file
const outputFilePath = 'output.csv';

// Headers for the CSV file
const headers = [
    { id: 'horseName', title: 'Horse Name' },
    { id: 'usefNumber', title: 'USEF #' },
    { id: 'dam', title: 'Dam' },
    { id: 'sire', title: 'Sire' },
    { id: 'foalDate', title: 'Foal Date' },
    { id: 'breed', title: 'Breed' },
    { id: 'owner', title: 'Owner' },
    { id: 'showID', title: 'Show ID' },
    { id: 'show', title: 'Show' },
    { id: 'jumperLevel', title: 'Jumper Level' },
    { id: 'state', title: 'State' },
    { id: 'zone', title: 'Zone' },
    { id: 'section', title: 'Section' },
    { id: 'description', title: 'Description' },
    { id: 'height', title: 'Height' },
    { id: 'placing', title: 'Placing' },
    { id: 'competed', title: 'Competed' },
    { id: 'money', title: 'Money' },
    { id: 'rider', title: 'Rider' },
    { id: 'zrd', title: 'ZRD' }
];

// Array to hold the extracted data
const data = [];

// Function to extract data from PDF
async function extractDataFromPdf(pdfPath) {
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdf(dataBuffer);
        const text = pdfData.text;
        console.log('Raw PDF Text:', text); // Log the full extracted text

        // Split the text into lines for processing
        const lines = text.split('\n');
        
        let currentHorse = {};
        let currentShow = {};
        let currentSection = {};
        let foundHorse = false; // Flag to stop after finding the first horse
        let extractedDam = false; // Flag to stop after extracting the dam
        let extractedSire = false; // Flag to stop after extracting the sire
        let extractedFoalDate = false; // Flag to stop after extracting the foal date
        let extractedBreed = false; // Added flag to stop after extracting the breed
        let shouldUpdateData = false; // Added flag to control when to update data
        let hasPushedData = false; // Added flag to track if data has been pushed

        lines.forEach((line, index) => {
            console.log(`Line ${index}:`, line); // Log each line with its index

            // Only process lines if we haven't found the horse yet
            if (!foundHorse) {
                const horseMatch = line.match(/^(?:US EQUESTRIAN HORSE REPORT\s+)?([A-Z\s]+?)\s*\((\d+)\)/);
                if (horseMatch) {
                    currentHorse = {
                        horseName: horseMatch[1].trim(),
                        usefNumber: horseMatch[2]
                    };
                    foundHorse = true;
                }
            }

            // Extract Sire if we've found the horse and haven't extracted the sire yet
            if (foundHorse && line.includes("Sire:")) {
                currentHorse.sire = extractValue(line, 'Sire:');
            }

            // Extract Dam (split at "Microchip:")
            if (foundHorse && line.includes("Dam:")) {
                currentHorse.dam = extractValue(line, 'Dam:');
            }

            // Extract Foal Date
            if (foundHorse && line.includes("Foal Date:")) {
                currentHorse.foalDate = extractValue(line, 'Foal Date:');
            }

            // Extract Breed (split at "Microchip:" or "Dam:")
            if (foundHorse && line.includes("Breed:")) {
                currentHorse.breed = extractValue(line, 'Breed:');
            }

            // // Extract Show and Event Information
            // if (line.includes("Jumper Level")) {
            //     currentShow = {
            //         showID: extractValue(line, 'Show ID:'),
            //         show: extractValue(line, 'Show:'),
            //         jumperLevel: extractValue(line, 'Jumper Level:'),
            //         state: extractValue(line, 'State:'),
            //         zone: extractValue(line, 'Zone:')
            //     };
            // }

            // // Extract Competition Section Details (e.g., Class, Height, etc.)
            // if (line.includes("SECTION:")) {
            //     currentSection = {
            //         section: extractValue(line, 'SECTION:'),
            //         description: extractValue(line, 'DESCRIPTION:'),
            //         height: extractValue(line, 'HEIGHT:'),
            //         placing: extractValue(line, 'PLACING:'),
            //         competed: extractValue(line, 'COMPETED:'),
            //         money: extractValue(line, 'MONEY:'),
            //         rider: extractValue(line, 'RIDER:'),
            //         zrd: extractValue(line, 'ZRD:')
            //     };

            //     // Add full competition row data
            //     data.push({
            //         ...currentHorse,
            //         ...currentShow,
            //         ...currentSection
            //     });
            // }
           
        });

        if (foundHorse) {
            data.push(currentHorse);
        }

        // Write to CSV
      const csvWriter = createCsvWriter({ path: outputFilePath, header: headers });
        await csvWriter.writeRecords(data);
        console.log('CSV file written successfully');
        
    } catch (error) {
        console.error('Error processing PDF:', error);
    }
}

// Helper function to extract values after a label
// Helper function to extract values after a label
function extractValue(line, label) {
    if (line.includes(label)) {
        const valuePart = line.split(label)[1].trim();
        let value;
        switch (label) {
            case 'Sire:':
                value = valuePart.split(/Dam:/)[0].trim();
                break;
            case 'Dam:':
                value = valuePart.split(/Microchip:/)[0].trim(); // Fix: Split at Microchip:
                break;
            case 'Foal Date:':
                value = valuePart.split(/Breed:/)[0].trim();
                break;
            case 'Breed:':
                value = valuePart.split(/Dam:|Microchip:/)[0].trim(); // Handle edge cases
                break;
            default:
                value = valuePart;
        }
        return value;
    }
    return '';
}

extractDataFromPdf(inputPdfPath);