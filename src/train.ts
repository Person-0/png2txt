import fs from "fs";
import path from "path";
import { processImage, imageDataToBuffer } from "./imageProcessing";

async function splitTrainingImagesIntoChars(dataPath: string, images: string[]) {
    const trainingImagesDir = path.join(dataPath, 'training_images');
    if (fs.existsSync(trainingImagesDir)) {
        fs.rmSync(trainingImagesDir, { recursive: true, force: true });
    }
    fs.mkdirSync(trainingImagesDir);
    console.log("created training characters directory.");

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
                let maxIndex = 0;
                for (const filename of fs.readdirSync(charFolder)) {
                    const index = parseInt(filename.split(".")[0]);
                    if (index > maxIndex) {
                        maxIndex = index;
                    }
                }
                charIndex = maxIndex + 1;
            } else {
                fs.mkdirSync(charFolder);
            }
            const finalImagePath = path.join(charFolder, charIndex.toString() + ".png");
            fs.writeFileSync(finalImagePath, imageDataToBuffer(processedImage.detections[i].data));
            console.log("wrote " + char + "/" + charIndex.toString() + ".png");
        }
    }
}

export async function train(dataPath: string) {
    if (!(fs.existsSync(dataPath) && fs.lstatSync(dataPath).isDirectory())) {
        throw "error: training data path does not exist / is not a directory";
    }

    const images = fs.readdirSync(dataPath).filter(e => isImage(e));
    if (!images.length) {
        throw "error: training data directory has no images";
    }

    console.log("splitting training images into characters according to labels...");
    await splitTrainingImagesIntoChars(dataPath, images);

    console.log("finished");
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