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

  const relationResponse = await server.inject({
    method: 'GET',
    url: '/meta/users/1?with=profile,posts,roles&select%5Bprofile%5D=bio&select%5Bposts%5D=title&select%5Broles%5D=name',
  });

  if (relationResponse.statusCode !== 200) {
    throw new Error(
      `GET /meta/users/:id with relations failed: ${relationResponse.body}`,
    );
  }

  assertRelations(relationResponse.json().data);

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

function assertRelations(user: any): void {
  if (user.profile?.bio !== 'Wrote the first published computer program.') {
    throw new Error(`Expected selected profile bio: ${JSON.stringify(user)}`);
  }

  if (user.profile.id !== undefined) {
    throw new Error(
      `Profile id should not be selected: ${JSON.stringify(user)}`,
    );
  }

  if (user.posts?.[0]?.title !== 'Notes on the Analytical Engine') {
    throw new Error(`Expected selected post title: ${JSON.stringify(user)}`);
  }

  if (user.posts[0].id !== undefined) {
    throw new Error(`Post id should not be selected: ${JSON.stringify(user)}`);
  }

  const roleNames = user.roles?.map((role) => role.name).sort();

  if (JSON.stringify(roleNames) !== JSON.stringify(['admin', 'author'])) {
    throw new Error(`Expected selected role names: ${JSON.stringify(user)}`);
  }

  if (user.roles[0].id !== undefined) {
    throw new Error(`Role id should not be selected: ${JSON.stringify(user)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
