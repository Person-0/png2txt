import * as tf from '@tensorflow/tfjs-node';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

const classifier = knnClassifier.create();

function colorTensor(r: number, g: number, b: number) {
  return tf.tensor2d([[r, g, b]]).div(255);
}

classifier.addExample(colorTensor(0, 0, 0), "black");
classifier.addExample(colorTensor(10, 10, 10), "black");

classifier.addExample(colorTensor(255, 255, 255), "white");
classifier.addExample(colorTensor(250, 250, 250), "white");

classifier.addExample(colorTensor(100, 100, 100), "gray");
classifier.addExample(colorTensor(120, 120, 120), "gray");

const pred = colorTensor(255, 255, 255);

classifier.predictClass(pred, 3).then(console.log);