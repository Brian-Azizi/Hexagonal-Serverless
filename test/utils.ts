import { DynamoDbDocumentClient } from "../src/adapters/documentClient";

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

export const emptyTable = (documentClient: DynamoDbDocumentClient) => async (
  tableName: string
): Promise<void> => {
  const { Items } = await documentClient
    .scan({ TableName: tableName })
    .promise();

  const deleteRequests = Items?.map((Item) =>
    documentClient
      .delete({
        TableName: tableName,
        Key: { PK: Item.PK, SK: Item.SK },
      })
      .promise()
  );
  if (deleteRequests) await Promise.all(deleteRequests);
};
