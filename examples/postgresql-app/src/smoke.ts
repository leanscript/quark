import { createApp } from './main';

async function main(): Promise<void> {
  const app = await createApp();
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const server = app.getHttpAdapter().getInstance();

  const listResponse = await server.inject({
    method: 'GET',
    url: '/meta/users',
  });

  if (listResponse.statusCode !== 200) {
    throw new Error(`GET /meta/users failed: ${listResponse.body}`);
  }

  const createResponse = await server.inject({
    method: 'POST',
    url: '/meta/users',
    payload: {
      name: 'Mary Jackson',
      email: 'mary@example.com',
    },
  });

  if (createResponse.statusCode !== 201) {
    throw new Error(`POST /meta/users failed: ${createResponse.body}`);
  }

  const created = createResponse.json();
  const readResponse = await server.inject({
    method: 'GET',
    url: `/meta/users/${created.data.id}`,
  });

  if (readResponse.statusCode !== 200) {
    throw new Error(`GET /meta/users/:id failed: ${readResponse.body}`);
  }

  console.log('PostgreSQL example smoke test passed');
  console.log(readResponse.body);

  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
