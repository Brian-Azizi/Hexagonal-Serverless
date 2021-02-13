import { DynamoDbDocumentClient } from "../src/documentClient";

export const today = () => {
  const result = new Date();
  result.setHours(0, 0, 0, 0);
  return result;
};

export const tomorrow = () => {
  const result = today();
  result.setDate(result.getDate() + 1);
  return result;
};

export const later = () => {
  // 100 days from today
  const result = today();
  result.setDate(result.getDate() + 100);
  return result;
};

export async function emptyTable(
  documentClient: DynamoDbDocumentClient
): Promise<void> {
  const { Items } = await documentClient
    .scan({ TableName: "Allocations" })
    .promise();

  const deleteRequests = Items?.map((Item) =>
    documentClient
      .delete({
        TableName: "Allocations",
        Key: { PK: Item.PK, SK: Item.SK },
      })
      .promise()
  );
  if (deleteRequests) await Promise.all(deleteRequests);
}
