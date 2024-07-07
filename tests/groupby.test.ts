import {expect, test} from '@jest/globals';
import { Olmos } from "../src/olmos";

interface PersonaSchema {
    nombre: string,
    cedula: string,
    cod_cargo: number,
    telefono: number,
    password: string,
    cod_zona: number
}

const personas = Olmos.new<PersonaSchema, "Personas">("Personas");

personas.select("nombre").groupBy("cedula");

personas.select("cedula").where("cedula").isNotNull().groupBy("cedula");

test('Group in select', function () {
    const res = personas.
        select("cedula").
        groupBy("cedula");

    const query = "SELECT cedula FROM Personas group by cedula";
    const args: any[] = [];

    expect(query).toBe(res.query);
    for (const arg of res.args){
        expect(args).toContain(arg);
    }
});

test('Group in where', function () {
    const res = personas.
        select("cedula").
        where("cedula").isNotNull().
        groupBy("cedula");

    const query = `SELECT cedula FROM Personas 
        WHERE cedula IS NOT NULL 
        group by cedula`.replace(/\s+/g, ' ');
    const args: any[] = [];

    expect(query).toBe(res.query);
    for (const arg of res.args){
        expect(args).toContain(arg);
    }
});
