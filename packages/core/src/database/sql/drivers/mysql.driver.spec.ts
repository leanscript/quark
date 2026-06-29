import { MysqlDriver } from './mysql.driver';

describe('MysqlDriver', () => {
  it('normalizes LIMIT and OFFSET placeholders before execute', async () => {
    const pool = {
      execute: jest.fn().mockResolvedValue([[{ id: 1 }], undefined]),
    };
    const driver = new MysqlDriver({ pool });

    const result = await driver.query(
      'SELECT * FROM `users` WHERE `email` = ? LIMIT ? OFFSET ?',
      ['ada@example.com', 14, 0],
    );

    expect(result.rows).toEqual([{ id: 1 }]);
    expect(pool.execute).toHaveBeenCalledWith(
      'SELECT * FROM `users` WHERE `email` = ? LIMIT 14 OFFSET 0',
      ['ada@example.com'],
    );
  });
});
