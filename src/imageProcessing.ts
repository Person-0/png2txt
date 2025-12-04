import { createCanvas, ImageData, loadImage, CanvasRenderingContext2D } from 'canvas';

const PIX_THRESH = 100;
const X_THRESH = 3;

class charPosDataInfo {
    x: number;
    y: number;
    width: number;
    height: number;
    data: ImageData;

    constructor(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.data = ctx.getImageData(x, y, width, height);
    }
}

export function imageDataToBuffer(imgdta: ImageData) {
    const canvas = createCanvas(imgdta.width, imgdta.height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imgdta, 0, 0);
    return canvas.toBuffer();
}

export async function processImage(imagePath: string) {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    const processedImageData = new Uint8ClampedArray(imageData.data.length);
    processedImageData.fill(0, 0, imageData.data.length);

    // highlights only pixels that belong to characters, also sets the x coordinate index of 
    // every pixel that belongs to characters as 1 in hScanUVstrip
    const hScanUVstrip = new Uint8ClampedArray(image.width);
    for (let i = 0; i < imageData.data.length; i += 4) {
        let pix = imageData.data[i + 2];
        if (pix < PIX_THRESH) {
            pix = 255;
            const pi = i / 4;
            const x = pi % image.width;
            hScanUVstrip.set([1], x);
        } else {
            pix = 0;
        }
        processedImageData.set([pix, pix, pix, 255], i);
    }
    ctx.putImageData(new ImageData(processedImageData, image.width, image.height), 0, 0);

    const detectedCharacters: charPosDataInfo[] = [];
    {

        // smoothens x detections in hScanUVstrip so that small breaks
        // are not counted as separate chars in the image as the
        // chars can have blank lines in-between
        {
            let inVoid = true;
            let lastMiss = 0;
            let lastHit = 0;
            for (let i = 0; i < hScanUVstrip.length; i++) {
                const hit = hScanUVstrip[i] === 1;
                if (inVoid) {
                    if (hit) {
                        inVoid = false;
                    }
                } else {
                    if (hit) {
                        if (lastMiss < X_THRESH) {
                            hScanUVstrip.set(new Array(i - lastHit).fill(1), lastHit);
                        } else {
                            inVoid = true;
                        }
                        lastMiss = 0;
                    } else {
                        lastMiss += 1;
                    }
                }
                if (hit) {
                    lastHit = i;
                }
            }
        }

        // calculates x ranges of characters and puts them in xGroups
        let xGroups: [number, number][] = [];
        {
            let inVoid = false;
            for (let i = 0; i < image.width; i++) {
                const hit = hScanUVstrip[i];
                if (inVoid) {
                    if (hit) {
                        xGroups.push([i, 0]);
                        inVoid = false;
                    }
                } else {
                    if (!hit) {
                        if (xGroups.length) {
                            xGroups[xGroups.length - 1][1] = i;
                        }
                        inVoid = true;
                    }
                }
            }
        }

        // calculates y min & max for all ranges calculated in xGroups,
        // finally pushes the result to detectedCharacters
        for (const xGroup of xGroups) {
            const [start, end] = xGroup;
            let ymin = Infinity, ymax = 0;

            for (let y = 0; y < image.height; y++) {
                for (let x = start; x <= end; x++) {
                    const i = (y * image.width + x) * 4;
                    if (processedImageData[i] === 255) {
                        if (y > ymax) {
                            ymax = y;
                        }
                        if (y < ymin) {
                            ymin = y;
                        }
                    }
                }
            }

            detectedCharacters.push(
                new charPosDataInfo(
                    ctx, 
                    start, ymin, end - start, ymax - ymin
                )
            );
        }
    }

    const helper_canvas = createCanvas(image.width, image.height * 2);
    const helper_ctx = helper_canvas.getContext("2d");

    helper_ctx.drawImage(image, 0, 0);
    helper_ctx.putImageData(ctx.getImageData(0, 0, image.width, image.height), 0, image.height);

    for (const coords of detectedCharacters) {
        helper_ctx.strokeStyle = "red";
        helper_ctx.strokeRect(coords.x, coords.y + image.height, coords.width, coords.height);
    }

    return {
        /**
         * A help image to validate detections.
         * Contains two images of same dimensions with one on top of other.
         * Top part is original image that was processed.
         * Bottom part is processed image with detection markers.
         */
        helpImageBuff: helper_canvas.toBuffer(),
        /**
         * Stores characters detected in order as instances of charPosDataInfo
         */
        detections: detectedCharacters
    };
}