export class MockQueueService {
  async addJob(name: string, data: any) {
    return { id: 'mock-job-id', name, data } as any;
  }
  async close() {}
}
