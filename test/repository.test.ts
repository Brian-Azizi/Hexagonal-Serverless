import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Batch } from "../src/model";

const docClient = new DocumentClient({
  apiVersion: "2012-08-10",
  region: "eu-west-1",
});

describe("DynamoRepository", () => {
  it("can save a batch", async () => {
    const batch = new Batch("batch1", "RUSTY-SOAPDISH", 100);

    // const repo = new DynamoRepository();
    // await repo.add(batch);

    var params = {
      TableName: "Batches",
    };
    const { Items } = await docClient.scan(params).promise();
    expect(Items).toStrictEqual([
      {
        eta: "2021-04-20",
        id: "test01",
        purchased_quantity: 100,
        reference: "batch01",
        sku: "RUSTY-SOAPDISH",
      },
    ]);
  }, 30000);

  it("can retrieve a batch with allocations", () => {});
});
