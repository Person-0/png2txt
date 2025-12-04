import fs from "fs";
import path from "path";
import { processImage, imageDataToBuffer } from "./imageProcessing";

function readCharacterDirectory(charFolder: string) {
    return fs.readdirSync(charFolder)
        .filter(e => isImage(e))
        .map(e => parseInt(e.split(".")[0]));
}

function randomSplitArray(array: any[], t: number) {
    if(t > 1) {
        throw "t cannnot be greater than 1";
    }
    const n = Math.floor(array.length * t);
    let array_1 = [];
    let array_2 = [...array];
    for(let _ = 0; _ < n; _++) {
        const a2l = array_2.length;
        const sel = Math.floor(Math.random() * a2l);
        array_1.push(array_2[sel]);
        array_2 = array_2.slice(0, sel).concat(array_2.slice(sel + 1, a2l));
    }
    return [array_1, array_2];
}

function isImage(imageName: string) {
    return (
        imageName.endsWith(".png") ||
        imageName.endsWith(".jpg") ||
        imageName.endsWith(".jpeg") ||
        imageName.endsWith(".svg") ||
        imageName.endsWith(".webp")
    )
}

async function splitTrainingImagesIntoChars(dataPath: string, images: string[], trainingImagesFolderName = 'training_images', startFresh = false) {
    const trainingImagesDir = path.join(dataPath, trainingImagesFolderName);

    if (fs.existsSync(trainingImagesDir)) {
        if (startFresh) {
            fs.rmSync(trainingImagesDir, { recursive: true, force: true });
            fs.mkdirSync(trainingImagesDir);
            console.log("cleared directory /" + trainingImagesFolderName);
        }
    } else {
        fs.mkdirSync(trainingImagesDir);
        console.log("created directory /" + trainingImagesFolderName);
    }

    for (const imageName of images) {
        const label = imageName.split(".")[0];
        const imagePath = path.join(dataPath, imageName);
        const processedImage = await processImage(imagePath);
        if (label.length !== processedImage.detections.length) {
            console.log("warn: skipping " + imageName + " due to label detection length mismatch.");
            continue;
        }
        for (let i = 0; i < label.length; i++) {
            let charIndex = 0;
            const char = label[i];
            const charFolder = path.join(trainingImagesDir, char);
            if (fs.existsSync(charFolder)) {
                charIndex = Math.max(...readCharacterDirectory(charFolder)) + 1;
            } else {
                fs.mkdirSync(charFolder);
            }
            const finalImagePath = path.join(charFolder, charIndex.toString() + ".png");
            fs.writeFileSync(finalImagePath, imageDataToBuffer(processedImage.detections[i].data));
            console.log("wrote " + char + "/" + charIndex.toString() + ".png");
        }
    }

    return trainingImagesDir;
}

export async function train(dataPath: string) {
    if (!(fs.existsSync(dataPath) && fs.lstatSync(dataPath).isDirectory())) {
        throw "error: training data path does not exist / is not a directory";
    }

    const images = fs.readdirSync(dataPath).filter(e => isImage(e));
    if (!images.length) {
        throw "error: training data directory has no images";
    }

    const [trainingImages, testingImages] = randomSplitArray(images, 0.7);
    console.log("images distributed randomly for training and testing.");

    const trainingImagesDir = await splitTrainingImagesIntoChars(dataPath, trainingImages);
    console.log("training images split into characters according to labels.")

    // continue here

    console.log("finished");
}