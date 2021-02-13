set -e

docker-compose up -d
sleep 2
aws dynamodb create-table \
    --table-name Allocations \
    --attribute-definitions '[
      {
          "AttributeName": "PK",
          "AttributeType": "S"
      },
      {
          "AttributeName": "SK",
          "AttributeType": "S"
      }
    ]' \
    --key-schema '[
      {
          "AttributeName": "PK",
          "KeyType": "HASH"
      },
      {
          "AttributeName": "SK",
          "KeyType": "RANGE"
      }
    ]' \
    --provisioned-throughput '{
      "ReadCapacityUnits": 1,
      "WriteCapacityUnits": 1
    }' \
    --endpoint-url http://localhost:8000 \
    --region eu-west-1
