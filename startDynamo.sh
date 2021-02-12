set -e

docker-compose up -d
sleep 2
aws dynamodb create-table \
    --table-name Batches \
    --attribute-definitions '[
      {
          "AttributeName": "Reference",
          "AttributeType": "S"
      }
    ]' \
    --key-schema '[
      {
          "AttributeName": "Reference",
          "KeyType": "HASH"
      }
    ]' \
    --provisioned-throughput '{
      "ReadCapacityUnits": 1,
      "WriteCapacityUnits": 1
    }' \
    --endpoint-url http://localhost:8000 \
    --region eu-west-1