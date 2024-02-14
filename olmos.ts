import { ResultSetHeader, RowDataPacket } from "mysql2";

type AddPrefix<table extends string, T> = {
  [K in keyof T as `${table}.${string & K}`]: T[K];
};

type MergeSchema<
    SchemaMap extends Record<string, any>, 
    Keys extends (keyof SchemaMap)[], 
    Schema extends Record<string, any> = {}
> =
      Keys extends [infer K extends string, ...infer Rest extends string[]]
        ? MergeSchema<SchemaMap, Rest, Schema & AddPrefix<K, SchemaMap[K]>> 
        : Schema;
        
type MapPick<Map> = {
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

type GetCommonProperties<
    Map extends Record<string, any>,
    Tables extends (keyof Map)[],
    Acc extends Record<string, any> = {}
>=
  Tables extends [infer Table extends string, ...infer Rest extends string[]]
    ? Acc & GetCommonProperties<Map, Rest, {[K in string & keyof Map[keyof Map] as `${Table}.${K}`]: Map[Table][K]}>
    : Acc

type GenerateSchema<
    Map extends Record<string, any>,
    Tables extends (keyof Map)[],

    merged extends Record<string, any> = Merge<Map, Tables>,
    comunes = keyof Map[keyof Map],
    distintos = Exclude<keyof merged, comunes>
>=
    {[K in string & distintos]: merged[K]} &
    GetCommonProperties<Map, Tables>;

interface DBConnection{
    query<T>(sql: string, value: any): Promise<T>;
}

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
    Schema = GenerateSchema<SchemaMap, Tables>
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
                        Record<keyof MergeSchema<SchemaMap & S, [...Tables, ...T]>, 
                               keyof MergeSchema<S & SchemaMap, [...T, ...Tables]>
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
        where: Partial<Schema> | undefined = undefined, 
        fields: Field[] | [] = []
    ): 
        Promise<MapPick<Pick<Schema, typeof fields[number]>>>
    {
        const {whereQuery, whereList} = this.formatWhere(where);
        
        const query = `
            SELECT ${fields.length > 0 ? fields.join(',') : '*'}
            FROM ${this.from}
            ${whereQuery}`;

        const [rows] = await this.connection.query<RowDataPacket[]>(query, whereList);

        if (rows.length <= 0){
            throw new Error(`No se encontro el item de la tabla ${this.from}`);
        }

        return rows[0] as any;
    }

    async getAll<const Field extends keyof Schema>(
        where: Partial<Schema>, 
        fields: Field[] | [] = []): 
        Promise<MapPick<Pick<Schema, typeof fields[number]>>>
    {
        const {whereQuery, whereList} = this.formatWhere(where);
        
        const query = `
            SELECT ${fields.length > 0 ? fields.join(',') : '*'}
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
