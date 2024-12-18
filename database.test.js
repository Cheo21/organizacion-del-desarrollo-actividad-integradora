const { Client } = require('pg')
const {
  /**
   * Recuperamos el esquema esperado
   *
   * Para una primer etapa, se recomienda importar la propiedad
   * "baseFields" reenombrandola a "expectedFields"
   */
  baseFields: expectedFields
} = require('./schema_base')

describe('Test database', () => {
  /**
   * Variables globales usadas por diferentes tests
   */
  let client

  /**
   * Generamos la configuracion con la base de datos y
   * hacemos la consulta sobre los datos de la tabla "users"
   *
   * Se hace en la etapa beforeAll para evitar relizar la operación
   * en cada test
   */
  beforeAll(async () => {
    client = new Client({
      connectionString: process.env.DATABASE_URL
    })
    await client.connect()
  })

  /**
   * Cerramos la conexion con la base de datos
   */
  afterAll(async () => {
    await client.end()
  })

  /**
   * Validamos el esquema de la base de datos
   */
  describe('Validate database schema', () => {
    /**
     * Variable donde vamos a almacenar los campos
     * recuperados de la base de datos
     */
    let fields
    let result

    /**
     * Generamos un objeto para simplificar el acceso en los test
     */
    beforeAll(async () => {
      /**
       * Consulta para recuperar la información de la tabla
       * "users"
       */
      result = await client.query(
        `SELECT
          column_name, data_type
        FROM
          information_schema.columns
        WHERE
          table_name = $1::text`,
        ['users']
      )

      fields = result.rows.reduce((acc, field) => {
        acc[field.column_name] = field.data_type
        return acc
      }, {})
    })

    describe('Validate fields name', () => {
      /**
       * Conjunto de tests para validar que los campos esperados se
       * encuentren presentes
       */
      test.each(expectedFields)('Validate field $name', ({ name }) => {
        expect(Object.keys(fields)).toContain(name)
      })
    })

    describe('Validate fields type', () => {
      /**
       * Conjunto de tests para validar que los campos esperados sean
       * del tipo esperado
       */
      test.each(expectedFields)('Validate field $name to be type "$type"', ({ name, type }) => {
        expect(fields[name]).toBe(type)
      })
    })
  })

  describe('Validate insertion', () => {
    afterEach(async () => {
      await client.query('TRUNCATE users')
    })

    test('Insert a valid user', async () => {
      let result = await client.query(
        `INSERT INTO
         users (email, username, birthdate, city)
         VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata')`
      )

      expect(result.rowCount).toBe(1)

      result = await client.query(
        'SELECT * FROM users'
      )

      const user = result.rows[0]
      const userCreatedAt = new Date(user.created_at)
      const currentDate = new Date()

      expect(user.email).toBe('user@example.com')
      expect(userCreatedAt.getFullYear()).toBe(currentDate.getFullYear())
    })

    test('Insert a user with an invalid email', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city)
                     VALUES ('user', 'user', '2024-01-02', 'La Plata')`

      await expect(client.query(query)).rejects.toThrow('users_email_check')
    })

    //Añadidas
    test('Insert a user without email', async () => {
      const query = `INSERT INTO
                      users (email, username, birthdate, city)
                      VALUES ('', 'user', '2024-01-02', 'La Plata')`
      await expect(client.query(query)).rejects.toThrow('users_email_check')

    })


    test('Insert a user with email to long', async () => {
      const query = `INSERT INTO
                      users (email, username, birthdate, city)
                      VALUES ('estoesunmailmuylargosesuponequedebedeserdee30@mascosasdelotrolado.com', 'user', '2024-01-02', 'La Plata')`
      await expect(client.query(query)).rejects.toThrow('value too long for type character varying(50)')

    })

    test('Insert a user with only @ in the email field', async () => {
      const query = `INSERT INTO
                      users (email, username, birthdate, city)
                      VALUES ('@', 'user', '2024-01-02', 'La Plata')`
      await expect(client.query(query)).rejects.toThrow('users_email_check')

    })
    

    test('Insert a user without name', async() => {
      const query = `INSERT INTO
                      users (email, username, birthdate, city)
                      VALUES ('ejemplo@test.com', '', '2024-05-4', 'la plata')`
      await expect(client.query(query)).rejects.toThrow('new row for relation "users\" violates check constraint "username_length"')
    })

    test('Insert a user with a name shorter than 3 characters', async() => {
      const query = `INSERT INTO
                      users (email, username, birthdate, city)
                      VALUES ('ejemplo@test.com', 'pe', '2024-05-4', 'la plata')`
      await expect(client.query(query)).rejects.toThrow('new row for relation \"users\" violates check constraint "username_length"')
    })
   
    test('Insert a user with a name containing numbers', async() => {
      const query = `INSERT INTO
                      users (email, username, birthdate, city)
                      VALUES ('ejemplo@test.com', 'pepe21', '2024-05-4', 'la plata')`
      await expect(client.query(query)).rejects.toThrow('new row for relation "users" violates check constraint "username_with_number')
    })


    test('Insert a user with an invalid birthdate', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city)
                     VALUES ('user@example.com', 'user', 'invalid_date', 'La Plata')`

      await expect(client.query(query)).rejects.toThrow('invalid input syntax for type date')
    })


    test('Insert a user with an invalid birthdate', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city)
                     VALUES ('user@example.com', 'user', '4456456', 'La Plata')`

      await expect(client.query(query)).rejects.toThrow('invalid input syntax for type date')
    })


    test('Insert a user was born in the future', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city)
                     VALUES ('user@example.com', 'user', '2026-01-02', 'La Plata')`

      await expect(client.query(query)).rejects.toThrow('new row for relation "users" violates check constraint "future_future')
    })


    test('Insert a user born 130 years ago', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city)
                     VALUES ('user@example.com', 'user', '1884-01-01', 'La Plata')`

      await expect(client.query(query)).rejects.toThrow('new row for relation "users" violates check constraint "future_future')
    })

    test('Insert a user without birthdate', async () => {
      const query = `INSERT INTO
                     users (email, username, city)
                     VALUES ('user@example.com', 'user', 'La Plata')`

      await expect(client.query(query)).rejects.toThrow('null value in column "birthdate"')
    })



    test('Insert a user without city', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate)
                     VALUES ('user@example.com', 'user', '2024-01-02')`

      await expect(client.query(query)).rejects.toThrow('null value in column "city"')
    })

    test('Insert a user wit city with numbers', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city)
                     VALUES ('user@example.com', 'user', '2024-01-02', '4468')`

      await expect(client.query(query)).rejects.toThrow('new row for relation "users" violates check constraint "birthdate_numbers"')
    })

  })
})
