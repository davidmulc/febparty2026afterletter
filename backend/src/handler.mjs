import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.MEMORIES_TABLE;
const ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const LIMIT = 280;
const MAX_ITEMS = 200;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function response(statusCode, body = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ORIGIN,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(body)
  };
}

function cleanInput(raw) {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function validate(text) {
  if (!text) return "Text is required.";
  if (text.length > LIMIT) return `Text must be ${LIMIT} characters or fewer.`;
  return null;
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === "OPTIONS") {
    return response(204);
  }

  if (method === "GET") {
    const query = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": "MEMORY"
      },
      ScanIndexForward: false,
      Limit: MAX_ITEMS
    });

    const { Items = [] } = await ddb.send(query);

    const items = Items.map((item) => ({
      id: item.id,
      text: item.text,
      createdAt: item.createdAt
    }));

    return response(200, { items });
  }

  if (method === "POST") {
    let body;

    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return response(400, { error: "Invalid JSON payload." });
    }

    const text = cleanInput(body.text);
    const error = validate(text);
    if (error) {
      return response(400, { error });
    }

    const createdAt = new Date().toISOString();
    const id = randomUUID();

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: "MEMORY",
          sk: `${createdAt}#${id}`,
          id,
          text,
          createdAt
        }
      })
    );

    return response(201, {
      item: {
        id,
        text,
        createdAt
      }
    });
  }

  return response(405, { error: "Method not allowed." });
};
