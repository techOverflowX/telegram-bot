// mockPostgres.js
const { newDb } = require('pg-mem');

const createMockDb = () => {
  const db = newDb();

  // Create the lc_records table
  db.public.none(`
    DROP TABLE IF EXISTS public.lc_records;

    CREATE TABLE IF NOT EXISTS public.lc_records
    (
        id serial NOT NULL,
        username VARCHAR(64) COLLATE pg_catalog."default",
        qn_date VARCHAR(64) COLLATE pg_catalog."default",
        has_image BOOLEAN,
        msg_text TEXT COLLATE pg_catalog."default",
        "timestamp" timestamp,
        CONSTRAINT lc_records_pkey PRIMARY KEY (id)
    );
  `);

  // Insert initial data
  db.public.none(`
    INSERT INTO lc_records (username, qn_date, has_image, msg_text, "timestamp")
    VALUES ('paradite', '11/7/2022', TRUE, 'test msg', now());
  `);

  return {
    connect: async () => ({
      query: db.public.query.bind(db.public), // Bind the query method
      none: db.public.none.bind(db.public),   // Bind the none method for no-return queries
      one: db.public.one.bind(db.public),     // Bind the one method for single row queries
      // Add other methods as needed
    }),
    end: async () => {} // Mock end method
  };
};

module.exports = createMockDb;
