# Query builder library for typescript

## Type validations
https://github.com/Lautarotetamusa/Olmos.ts/assets/51541903/a6f19046-3810-4289-9532-e304bf218f7c

## Usage

```ts
import {Olmos} from "olmos"
import {connection} from "db.ts"

interface PersonaSchema {
    nombre: string,
    cedula: string,
    cod_cargo: number
}

interface CargoSchema {
    cod_cargo: number,
    id_depto: string
    nombre: string
}

const personaModel = Olmos.new<PersonaSchema, "Personas">("Personas", connection);

const cargo = Olmos.new<CargoSchema, "Cargos">("Cargos", sql);

const res = await Persona.model.getOne({}, ["nombre", "cedula"]);
//res.nombre
//res.cedula

const personasCargo = Persona.model.innerJoin(cargo, {
    "Personas.cod_cargo": "Cargos.cod_cargo",
});
const res1 = personasCargo.getOne({"Personas.cedula": 123});
```

## Motivation
