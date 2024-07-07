import { WhereIncompleted } from "./where";

type RemovePrefix<Map> = {
  [K in keyof Map as K extends `${string}.${infer Value}` ? Value : K]: Map[K];
}

export type Generated<T> = {
    value: T;
};
type getRequired<S> = Pick<S, {
    [K in keyof S]: S[K] extends Generated<any> ? never : K;
}[keyof S]>;

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
    Acc extends Record<string, string> = {},
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

export type getSchema<T> = 
    T extends Olmos<infer _, infer Schema>
        ? Schema
        : never;

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
    private from: keyof SchemaMap;

    private constructor(from: keyof SchemaMap){
        this.from = from;
    }

    static new<S extends Record<string, any>, const T extends string>(from: T) {
        return new Olmos<{[K in T]: S}, [T]>(from); 
    }

    select<const Field extends keyof Schema>(fields: Field[]){
        const select = fields.length == 0 ? "*" : fields.join(',');
        const query = `SELECT ${select} FROM ${this.from as string}`

        type NewSchema = RemovePrefix<Pick<Schema, Field>>;
        return new Select<NewSchema>(query)
    }
}

class Select<Schema extends Record<string, any>>{
    query: string;
    
    constructor(query: string){
        this.query = query; 
    }

    where<const Field extends keyof Schema>(fieldName: Field){
        return new WhereIncompleted<Schema, Field>(fieldName, this.query + " WHERE ");
    }
}

type S = {
    nombre: string,
    cedula: string,
    cod_cargo: number,
    telefono: number,
    password: string,
    cod_zona: number
}

type T = ["Personas"];
type SchemaMap = Record<string, any>;

type Schema = Prettify<generateSchema<{"Personas": S}, T>>;
type K = Prettify<keyof Schema>;
type k = Prettify<keyof SchemaMap>;
