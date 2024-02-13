import {Olmos} from "./olmos";
import {sql} from "./db";

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

interface DeptoSchema {
    id_depto: number,
    nombre: string,
    telefono: string
}
const cedula = "392142823"

async function main(){
    const personaModel = Olmos.new<PersonaSchema, "Personas">("Personas", sql); 
    const cargosModel = Olmos.new<CargoSchema, "Cargos">("Cargos", sql); 
    const deptoModel = Olmos.new<CargoSchema, "Departamentos">("Departamentos", sql); 

    const res = await personaModel.getOne({"Personas.cedula": cedula}, ["Personas.cedula", "Personas.nombre"]);
    console.log(res);
    
    const personaCargosModel = personaModel.innerJoin(cargosModel, {
        "Personas.cod_cargo": "Cargos.cod_cargo"
    });

    const res2 = await personaCargosModel.getAll({}, ["Cargos.cod_cargo", "Personas.cedula"]);
    console.log(res2);

    const res3 = await personaCargosModel.innerJoin(deptoModel, {
        "Cargos.id_depto": "Departamentos.id_depto"
    }).getOne({"Personas.cedula": cedula},
        ["Personas.cedula", "Cargos.cod_cargo", "Departamentos.id_depto"]
    );
    console.log(res3);

}
main().then(() => {});
