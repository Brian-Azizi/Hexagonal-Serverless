import { Handler, APIGatewayProxyEvent, Callback, Context } from "aws-lambda";

export const allocate: Handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const response = {
    statusCode: 201,
    body: JSON.stringify(
      {
        message: "Go Serverless v1.0! Your function executed successfully!",
      },
      null,
      2
    ),
  };

  return await response;
};
