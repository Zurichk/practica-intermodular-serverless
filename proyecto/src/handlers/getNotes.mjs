// Clientes para interactuar con la API de AWS

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Obtener el nombre de la tabla de DynamoDB a partir de la variable de entorno
const tableName = process.env.APP_TABLE;

// Integraremos la función lambda en modo Proxy con API Gateway
// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
// Por ello, el evento tendrá el formato descrito en la documentación:
// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

// Handler
export const handler = async (event) => {
  // Si no se recibe el método GET, se genera un error
  if (event.httpMethod !== "GET") {
    throw new Error(
      `Esta función solo admite peticiones GET. El método que has usado es: ${event.httpMethod}`,
    );
  }

  // Log en CloudWatch
  console.info("Petición recibida:", event);

  // Obtenemos el usuario autenticado. Esta información la proporcionará el servicio
  // Cognito una vez lo hayamos conectado
  // Si no tenemos Cognito conectado, lo que haremos será definir un usuario
  // de ejemplo, llamado "testuser". Así, durante la fase de desarrollo, todas
  // las notas estarán referenciadas a este usuario de test
  let userId, email, username;
  try {
    const userClaims = event.requestContext.authorizer.claims;

    userId = userClaims.sub;
    email = userClaims.email;
    username = userClaims["cognito:username"];
  } catch (error) {
    // Si Cognito no está conectado, la información de autenticación no le será pasada
    // a la función. En este caso utilizaremos un usuario fijo de test, "testuser"
    userId = "testuser";
    email = "test@test.com";
    username = "testuser";
  }

  // Parámetros de la petición de DynamoDB
  // Hacemos una query indicando una condición de igualdad en la clave de partición
  // Asumiendo que el esquema de la tabla haga referencia al userId como valor de la
  // clave de partición
  var params = {
    TableName: tableName,
    ExpressionAttributeValues: {
      ":pk": userId,
    },
    KeyConditionExpression: "PK = :pk",
  };

  // Petición a DynamoDB
  try {
    const data = await ddbDocClient.send(new QueryCommand(params));
    var items = data.Items;
  } catch (err) {
    console.log("Error", err);
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify(items),
  };

  console.info(
    `Respuesta de: ${event.path}; código: ${response.statusCode}; cuerpo (datos): ${response.body}`,
  );
  return response;
};
