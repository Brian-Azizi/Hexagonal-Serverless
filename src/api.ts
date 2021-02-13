import { Handler } from "aws-lambda";

export const allocate: Handler = (event: any) => {
  const response = {
    statusCode: 201,
    body: JSON.stringify(
      {
        message: "Go Serverless v1.0! Your function executed successfully!",
        input: event,
      },
      null,
      2
    ),
  };

  return new Promise((resolve) => {
    resolve(response);
  });
};
