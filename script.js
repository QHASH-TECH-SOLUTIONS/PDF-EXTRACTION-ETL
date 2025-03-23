const fs = require('fs');
const pdf = require('pdf-parse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const inputPdfPath = '/home/red-virus/Desktop/office/QHash/Running_Projects/pdf_Extractor/pdfs/sample5.pdf';
const outputFilePath = 'output.csv';

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
    { id: 'zrd', title: 'ZRD' },
    { id: 'rider', title: 'Rider' }
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
        let foundHorse = false; // Flag to stop after finding the first horse
        let owners = []; // Array to store multiple owners
        const showDetails = [];

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

            // Extract Owner at the Competition
            if (line.includes("Owner at the Competition:")) {
                const ownerMatch = line.match(/Owner at the Competition:\s*(.*)/);
                if (ownerMatch) {
                    owners.push(ownerMatch[1].trim());
                }
            }

            // Extract Show ID and Show Name
            const showIdMatch = line.match(/(\d+)\s+(\d{4}\s+[A-Z\s]+)/);
            if (showIdMatch) {
                const showID = showIdMatch[1];
                const show = showIdMatch[2];
                showDetails.push({ showID, show, sectionDetails: [] });
            }

            // Extract Jumper Level
            if (line.includes("Jumper Level:")) {
                const jumperLevelMatch = line.match(/Jumper Level:\s*(\d+)/);
                if (jumperLevelMatch && showDetails.length > 0) {
                    showDetails[showDetails.length - 1].jumperLevel = jumperLevelMatch[1];
                }
            }

            // Extract State
            if (line.includes("State:")) {
                const stateMatch = line.match(/State:\s*([A-Z]{2})/);
                if (stateMatch && showDetails.length > 0) {
                    showDetails[showDetails.length - 1].state = stateMatch[1];
                }
            }

            // Extract Zone
            if (line.includes("Zone:")) {
                const zoneMatch = line.match(/Zone:\s*(\d+)/);
                if (zoneMatch && showDetails.length > 0) {
                    showDetails[showDetails.length - 1].zone = zoneMatch[1];
                }
            }

            // Extract Section Details
            if (line.includes("SECTION:")) {
                const sectionMatch = line.match(/SECTION:\s*(.*)/);
                if (sectionMatch && showDetails.length > 0) {
                    const section = sectionMatch[1].trim();
                    currentSection = section;
                    showDetails[showDetails.length - 1].sectionDetails.push({ section, rows: [] });
                }
            }
            

            
        });

        // Populate the data array with all extracted details
        if (foundHorse) {
            owners.forEach(owner => {
                showDetails.forEach(showDetail => {
                    if (showDetail.sectionDetails && showDetail.sectionDetails.length > 0) {
                        showDetail.sectionDetails.forEach(sectionDetail => {
                            data.push({
                                ...currentHorse,
                                owner: owner,
                                showID: showDetail.showID,
                                show: showDetail.show,
                                jumperLevel: showDetail.jumperLevel || 'N/A',
                                state: showDetail.state || 'N/A',
                                zone: showDetail.zone || 'N/A',
                                section: sectionDetail.section || 'N/A'
                            });
                        });
                    } else {
                        // If no section details, add a row with just show details
                        data.push({
                            ...currentHorse,
                            owner: owner,
                            showID: showDetail.showID,
                            show: showDetail.show,
                            jumperLevel: showDetail.jumperLevel || 'N/A',
                            state: showDetail.state || 'N/A',
                            zone: showDetail.zone || 'N/A',
                            section: 'N/A'
                        });
                    }
                });
            });
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
function extractValue(line, label) {
    if (line.includes(label)) {
        const valuePart = line.split(label)[1].trim();
        let value;
        switch (label) {
            case 'Sire:':
                value = valuePart.split(/Dam:/)[0].trim();
                break;
            case 'Dam:':
                value = valuePart.split(/Microchip:/)[0].trim();
                break;
            case 'Foal Date:':
                value = valuePart.split(/Breed:/)[0].trim();
                break;
            case 'Breed:':
                value = valuePart.split(/Dam:|Microchip:/)[0].trim();
                break;
            default:
                value = valuePart;
        }
        return value;
    }
    return '';
}

// Run the extraction
extractDataFromPdf(inputPdfPath);