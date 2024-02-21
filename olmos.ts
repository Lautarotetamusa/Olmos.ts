import { ResultSetHeader, RowDataPacket } from "mysql2";

type RemovePrefix<Map> = {
  [K in keyof Map as K extends `${string}.${infer Value}` ? Value : K]: Map[K];
}

type Merge<
    Map extends Record<string, any>,
    Keys extends (keyof Map)[] = (keyof Map)[],
    Acc extends Record<string, any> = {}
>=
  Keys extends [infer K extends string, ...infer Rest extends string[]]
    ? Acc & Merge<Map, Rest, Map[K]>
    : Acc;

type generateSchema<
    Map extends Record<string, any>,
    Tables extends (keyof Map)[],
    Prev extends (keyof Map)[] = [],
    Acc extends Record<string, any> = {},
>=
  Tables extends [infer Table extends string, ...infer Rest extends string[]]
    ? Acc & generateSchema<
        Map, Rest, [...Prev, Table],
        parseSchema<Map, Table, [...Prev, ...Rest]>
    >
    : Acc

type parseSchema<
    Map extends Record<string, any>,
    Table extends string, //La tabla actual
    Tables extends (keyof Map)[], //Todas las otras tablas
    diff extends keyof Map[Table] = Exclude<keyof Map[Table], Exclude<keyof Map[Table], keyof Merge<Map, Tables>>>
> =
    Omit<Map[Table], diff> &
    {
        [K in string & diff as `${Table}.${K}`]: Map[Table][K]
    }

interface DBConnection{
    query<T>(sql: string, value: any): Promise<T>;
}

export type getSchema<T> = 
    T extends Olmos<infer _, infer _, infer Schema>
        ? Schema
        : never

export class Olmos<
    /** 
        * Todos los schemas que tiene el modelo. 
        * Al hacer un join se agrega una key con el schema de la tabla joineda.
        * Ej: {
             "Personas": PersonaSchema
             "Cargos": PersonaSchema
          }
    */
    SchemaMap extends Record<string, any>, 

    /**
        * Lista de tablas actuales del modelo.
        * Ej: ["Personas", "Cargos"]
        */
    const Tables extends (keyof SchemaMap)[],

    /**
        * Schema combinado de todas las tablas actuales.
        * Se agrega como prefijo el nombre de la tabla a los campos que esten duplicados.
        * Al hacer un join se agrega el nombre de la tabla a la lista de tablas.
        * Ej: {
             "Personas.nombre": string,
             "cedula": string,
             "cod_cargo": number,
             "Cargos.nombre": string
          }
        */
    Schema = generateSchema<SchemaMap, Tables>
>{
    /**
        * 
        */
    private from: string;
    connection: DBConnection;

    private constructor(from: string, connection: DBConnection){
        this.from = from;
        this.connection = connection;
    }

    static new<S extends Record<string, any>, const T extends string>(from: T, connection: DBConnection) {
        return new Olmos<{[K in T]: S}, [T]>(from as string, connection); 
    }

    protected formatWhere(req?: Partial<Schema>){
        let whereQuery = "";
        let whereList: any[] = []
        if (req && Object.keys(req).length > 0){
            type key = keyof typeof req;
            whereQuery = "WHERE ";
            for (let field in req){ 
                whereQuery += `${field} = ? AND `;
                whereList.push(req[field as key]);
            }
            whereQuery = whereQuery.substring(0, whereQuery.length-4);
            console.log(whereQuery);
            console.log(whereList);
        }

        return {
            whereQuery: whereQuery,
            whereList: whereList
        }
    }

    innerJoin<S extends Record<string, any>, 
              T extends string[],
             >(
                 model: Olmos<S, T>, 
                 on: Partial<
                    Record<
                        keyof generateSchema<SchemaMap & S, [...Tables, ...T]>,
                        keyof generateSchema<SchemaMap & S, [...Tables, ...T]>
                    >
                >){
        const onCondition = Object.keys(on).map(key => 
            `${key} = ${on[key as keyof SchemaMap] as any}`
        ).join(' and ');

        const joinedFrom = `
            ${this.from}
            INNER JOIN ${model.from}
            ON ${onCondition}
        `;
        console.log("join:", joinedFrom);

        return new Olmos<
            SchemaMap & S,
            [...Tables, ...T]
        >(joinedFrom, this.connection);
    }

    async getOne<const Field extends keyof Schema>(
        options: {
            where?: Partial<Schema>, 
            fields?: Field[]
        }
    ): Promise<RemovePrefix<Pick<Schema, Field>>>
    {
        const {whereQuery, whereList} = this.formatWhere(options.where);
        
        const query = `
            SELECT ${options.fields ? options.fields.join(',') : '*'}
            FROM ${this.from}
            ${whereQuery}`;

        const [rows] = await this.connection.query<RowDataPacket[]>(query, whereList);

        if (rows.length <= 0){
            throw new Error(`No se encontro el item de la tabla ${this.from}`);
        }

        return rows[0] as any;
    }

    async getAll<const Field extends keyof Schema>(
        options: {
            where?: Partial<Schema>, 
            fields?: Field[]
        }
    ): Promise<RemovePrefix<Pick<Schema, Field>>>
    {
        const {whereQuery, whereList} = this.formatWhere(options.where);
        
        const query = `
            SELECT ${options.fields ? options.fields.join(',') : '*'}
            FROM ${this.from}
            ${whereQuery}`;

        const [rows] = await this.connection.query<RowDataPacket[]>(query, whereList);
        return rows as any;
    }

    async insert(req: Schema): Promise<number>{
        const query = `INSERT INTO ${this.from} SET ?`

        try {
            const result = await this.connection.query<ResultSetHeader>(query, req);
            return result.insertId;
        } catch (error: any) {
            if ('code' in error && error.code == "ER_DUP_ENTRY")
                throw new Error(`Ya existe una ${this.from} con esta clave`);
            throw new Error(error.message);
        }
    }

    async update(req: Schema, 
                 where?: Partial<Schema>
        ){
        const {whereQuery, whereList} = this.formatWhere(where);

        const query = `
            UPDATE ${this.from}
            SET ? 
            ${whereQuery}
        `;
        try {
            const result = await this.connection.query<ResultSetHeader>(query, [req, whereList]);
            if (result.affectedRows == 0){
                throw new Error(`No se encontro el item de la tabla ${this.from}`);
            }
        } catch (error: any) {
            if ('code' in error && error.code == "ER_DUP_ENTRY")
            throw new Error(error.message);
        }
    }

    async delete(where?: Partial<Schema>){
        const {whereQuery, whereList} = this.formatWhere(where);

        const query = `
            DELETE FROM ${this.from}
            ${whereQuery}`

        const result = await this.connection.query<ResultSetHeader>(query, whereList);
        return result;
    }
}
