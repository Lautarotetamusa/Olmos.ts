import {expect, test} from '@jest/globals';
import { Olmos, getSchema } from "../src/olmos";

interface PersonaSchema {
    nombre: string,
    cedula: string,
    cod_cargo: number,
    telefono: number,
    password: string,
    cod_zona: number
}

const personas = Olmos.new<PersonaSchema, "Personas">("Personas");

//@ts-expect-error //cod_cargo not in select list
personas.select(["nombre"]).where("cod_cargo").equal(100);
//@ts-expect-error //cod_cargo is a number
personas.select(["cod_cargo"]).where("cod_cargo").in(["345", 100]);
//@ts-expect-error //cod_cargo is a number
personas.select(["cod_cargo"]).where("cod_cargo").equal("345");
//@ts-expect-error //cod_cargo is a number
personas.select(["cod_cargo"]).where("cod_cargo").greater("345");
//@ts-expect-error //cod_cargo is a number
personas.select(["nombre"]).where("nombre").equal("test").or("cod_cargo").isNull();

test('Select where', function () {
    const res = personas.
        select(["nombre", "cedula", "telefono"]).
        where("cedula").
            in(["345", "678", "123"]).
            and("telefono").isNotNull().
            or("telefono").equal(123);

    type Response = Prettify<getSchema<typeof personas>>;

    personas.select(["nombre", "cedula"]);

    const query = `SELECT nombre,cedula,telefono FROM Personas
    WHERE (cedula) IN (?, ?, ?)
        AND telefono IS NOT NULL
        OR telefono = ?`.replace(/\s+/g, ' ');
    const args = ["345", "678", "123", 123]

    expect(query).toBe(res.query);
    for (const arg of res.args){
        expect(args).toContain(arg);
    }
});

test('Number select', function () {
    const res = personas.
        select(["cod_cargo"]).
        where("cod_cargo").
            in([123, 456]);

    const query = `SELECT cod_cargo FROM Personas WHERE (cod_cargo) IN (?, ?)`;
    const args = [123, 456];

    expect(query).toBe(res.query);
    for (const arg of res.args){
        expect(args).toContain(arg);
    }
});
