/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  // id уже serial (автоинкремент) из первой миграции через shorthand `id: 'id'`

  pgm.addColumn('admins', {
    email: {
      type: 'text',
      notNull: true,
      unique: true,
    },
  });

  pgm.alterColumn('admins', 'name', {
    notNull: false,
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.alterColumn('admins', 'name', {
    notNull: true,
  });

  pgm.dropColumn('admins', 'email');
};
