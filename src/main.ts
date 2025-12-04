import express from "express";
import path from "path";
import fs from "fs";
import { processImage } from "./imageProcessing";
import { train } from "./train";
import KNNCharacterDetector from "./knn";

console.log("\n== IMG2TEXT ==\n");
if (process.argv[2] && process.argv[2] === "--prod") {
    console.log("Prod env detected, running main()");
    main();
} else {
    console.log("Test env detected, running train()");
    train(path.join(__dirname, '../samples')).then(main).catch(err => console.log(err));
}

function getLatestTrainedResult() {
    const trainResultsDir = path.join(__dirname, "../train_results");
    if(!(fs.existsSync(trainResultsDir))){
        throw "error: training results directory does not exist";
    }
    const files = fs.readdirSync(trainResultsDir).map(e => parseInt(e));
    if (files.length) {
        const latest = Math.max(...(files));
        const latestPath = path.join(trainResultsDir, latest.toString());
        return fs.readFileSync(latestPath).toString();
    } else {
        throw "error: training results directory is empty";
    }
}

async function main() {
    const app = express();

    const classifier = new KNNCharacterDetector();
    classifier.loadFromData(getLatestTrainedResult());

    app.use(express.static("public"));
    app.use(express.urlencoded({ extended: true }));

    const send = (res: express.Response, obj: object) => res.send(JSON.stringify(obj));

    app.get("/api/", (req, res) => {
        send(res, {
            error: false
        })
    });

    // Content-Type: application/x-www-form-urlencoded
    app.post("/api/predict", async (req, res) => {
        if (req.body.b64data && typeof req.body.b64data === "string" && req.body.b64data.length > 10) {

            let prediction = "";
            let helpImage = "";
            let error = false;
            try {
                const processed = await processImage(req.body.b64data);

                for (const char of processed.detections) {
                    prediction += (await classifier.predict(char.tensorData)).label;
                }

                helpImage = "data:image/png;base64," + processed.helpImageBuff.toString("base64");
            } catch (e) {
                error = true;
                console.log(e);
            }

            send(res, {
                error,
                prediction,
                helpImage
            })
            return;
        }

        send(res, {
            error: true,
            message: "invalid post body"
        })
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log("server listenting on port", PORT);
    });
}