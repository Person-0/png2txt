import fs from "fs";
import path from "path";
import { processImage } from "./imageProcessing";
import { ImageData } from "canvas";
import KNNCharacterDetector from "./knn";

const TrainingSplitFactor = 0.9; // 90% of the data is used for training, rest for testing
const supportedImageExtensions = [".png", ".jpg", ".jpeg", ".svg", ".webp"];

const isImageFile = (imageName: string) => 
    supportedImageExtensions.some(extn => 
        imageName.toLowerCase().endsWith(extn)
    );

function readImageDirectory(charFolder: string) {
    return fs.readdirSync(charFolder)
        .filter(e => isImageFile(e));
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
        array_2.splice(sel, 1);
    }
    return [array_1, array_2];
}

function moveImageMismatchLabel(dataPath: string, imgName: string, helpImg: Buffer<ArrayBufferLike>) {
    const mismatchFolder = path.join(dataPath, "mismatches");
    if(!(fs.existsSync(mismatchFolder))) fs.mkdirSync(mismatchFolder);
    const imgPath = path.join(dataPath, imgName);
    fs.writeFileSync(path.join(mismatchFolder, imgName.split(".")[0] + "_PROCESSED.png"), helpImg);
    fs.copyFileSync(
        imgPath,
        path.join(mismatchFolder, imgName)
    );
    fs.rmSync(imgPath);
}

async function splitImagesIntoChars(
    dataPath: string, 
    images: string[],
) {
    const dataset: {[char: string]: ImageData[]} = {};
    for (const imageName of images) {
        const label = imageName.split(".")[0];
        const imgPath = path.join(dataPath, imageName);
        const processedImage = await processImage(imgPath);
        if (label.length !== processedImage.detections.length) {
            console.log("warn: skipping " + imageName + " due to label detection length mismatch.");
            moveImageMismatchLabel(dataPath, imageName, processedImage.helpImageBuff);
            continue;
        }
        console.log("processed " + imageName);
        for (let i = 0; i < label.length; i++) {
            const char = label[i];
            const tensorData = processedImage.detections[i].tensorData;
            if(dataset[char]){
                dataset[char].push(tensorData)
            } else {
                dataset[char] = [tensorData];
            }
        }
    }
    return dataset;
}

export async function train(dataPath: string) {
    if (!(fs.existsSync(dataPath) && fs.lstatSync(dataPath).isDirectory())) {
        throw "error: training data path does not exist / is not a directory";
    }

    const images = readImageDirectory(dataPath);
    if (!images.length) {
        throw "error: training data directory has no images";
    }

    const [trainingImages, testingImages] = randomSplitArray(images, TrainingSplitFactor);
    console.log("images distributed randomly for training and testing.");

    const trainingDataset = await splitImagesIntoChars(dataPath, trainingImages);
    console.log("training images split into characters according to labels.")

    const knn = new KNNCharacterDetector();
    
    let allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for(const [char, tensorDataArray] of Object.entries(trainingDataset)) {
        for(const tensorData of tensorDataArray) {
            allChars = allChars.replace(char, "");
            knn.addImage(char, tensorData);
        }
    }
    if(allChars.length) {
        console.log("warn: characters samples left!!: " + allChars);
    }

    console.log("finished!");
    console.log("saving...")
    fs.writeFileSync(path.join(__dirname, "../train_results/", Date.now().toString()), knn.getSaveFile());
    console.log("saved classifier.")

    const testingDataset = await splitImagesIntoChars(dataPath, testingImages);

    let totalRecords = 0;
    for(const arr of Object.values(testingDataset)){
        totalRecords += arr.length;
    }
    
    let correct = 0;
    let avgPredMS = 0;
    let i = 0;
    for(const [char, tensorDataArray] of Object.entries(testingDataset)) {
        for(const tensorData of tensorDataArray) {
            const start = Date.now();
            const result = await knn.predict(tensorData);
            avgPredMS = ((avgPredMS * i) + Date.now() - start) / (i+1);
            i += 1;
            if(result.label === char) {
                correct += 1;
            }
        }
    }

    console.log("\n===============\n    Results\n")
    console.log("Total Records:", totalRecords);
    console.log("Correct Responses:", correct);
    console.log("Accuracy: " + (correct * 100 / totalRecords).toString() + "%");
    console.log("Average prediction time: " + avgPredMS.toString() + "ms");
    console.log("===============\n")

    return knn;
}