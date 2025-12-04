import * as tf from '@tensorflow/tfjs-node';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { ImageData } from 'canvas';

export default class KNNCharacterDetector {

  classifier: knnClassifier.KNNClassifier;
  k = 3;

  constructor() {
    this.classifier = knnClassifier.create();
  }

  imgDataToTensor(tensorData: ImageData) {
    const computed: number[] = [];
    for(let i = 0; i < tensorData.data.length; i+=4){
      computed.push(tensorData.data[i]);
    }
    return tf.tensor1d(computed);
  }

  addImage(label: string, tensorData: ImageData) {
    this.classifier.addExample(this.imgDataToTensor(tensorData), label);
  }

  async predict(tensorData: ImageData) {
    const pred = this.imgDataToTensor(tensorData);
    return await this.classifier.predictClass(pred, this.k);
  }
}