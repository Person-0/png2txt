import * as tf from '@tensorflow/tfjs-node';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { ImageData } from 'canvas';

export default class KNNCharacterDetector {

  classifier: knnClassifier.KNNClassifier;
  k = 3;

  constructor() {
    this.classifier = knnClassifier.create();
  }

  getSaveFile() {
    const data: { [label: string]: tf.Tensor2D | string } = this.classifier.getClassifierDataset();
    for (const label of Object.keys(data)) {
      const t = data[label] as tf.Tensor2D;
      data[label] = JSON.stringify({
        shape: t.shape,
        dtype: t.dtype,
        data: Array.from(t.dataSync())
      });
    }
    return JSON.stringify(data);
  }

  loadFromData(data: string) {
    const loaded = JSON.parse(data);
    for (const label of Object.keys(loaded)) {
      const parsed = JSON.parse(loaded[label]);
      loaded[label] = tf.tensor(parsed.data, parsed.shape, parsed.dtype);
    }
    this.classifier.setClassifierDataset(loaded);
  }

  imgDataToTensor(tensorData: ImageData) {
    const computed: number[] = [];
    for (let i = 0; i < tensorData.data.length; i += 4) {
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