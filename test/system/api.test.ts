import axios from "axios";
import * as uuid from "uuid";
import * as config from "../../config";

const generateSku = () => {
  return `TEST#${uuid.v4()}`;
};

const postToAddBatch = async (
  reference: string,
  sku: string,
  quantity: number,
  eta?: string
): Promise<void> => {
  const response = await axios.post(
    `${config.getApiUrl()}/add-batch`,
    JSON.stringify({ reference, sku, quantity, eta })
  );
  expect(response.status).toBe(201);
};

describe("Allocations API", () => {
  test("happy path returns a 201 and the allocated batch reference", async () => {
    const [sku, otherSku] = [generateSku(), generateSku()];
    const [earlyBatch, laterBatch, otherBatch] = [
      uuid.v4(),
      uuid.v4(),
      uuid.v4(),
    ];
    await postToAddBatch(earlyBatch, sku, 100, "2011-01-01");
    await postToAddBatch(laterBatch, sku, 100, "2011-01-02");
    await postToAddBatch(otherBatch, otherSku, 100);

    const requestData = { orderId: uuid.v4(), sku, quantity: 3 };
    const response = await axios.post(
      `${config.getApiUrl()}/allocate`,
      JSON.stringify(requestData)
    );
    expect(response.status).toBe(201);
    expect(response.data["batchref"]).toBe(earlyBatch);
  });

  test("unhappy path returns a 400 and the error message", async () => {
    const [sku, smallBatch, largeOrder] = [
      generateSku(),
      generateSku(),
      generateSku(),
    ];
    await postToAddBatch(smallBatch, sku, 10, "2011-01-01");

    const data = { orderId: largeOrder, sku, quantity: 20 };
    const response = await axios.post(`${config.getApiUrl()}/allocate`, data, {
      validateStatus: null,
    });
    expect(response.status).toBe(400);
    expect(response.data["message"]).toBe(`Out of stock for sku ${sku}`);
  });
});
