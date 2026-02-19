import { Injectable } from '@nestjs/common';
import { PubSub } from '@google-cloud/pubsub';

@Injectable()
export class PubsubService {
  private pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });

  async publish(topicName: string, message: any) {
    const topic = this.pubsub.topic(topicName);
    const dataBuffer = Buffer.from(JSON.stringify(message));
    await topic.publishMessage({ data: dataBuffer });
  }
}
