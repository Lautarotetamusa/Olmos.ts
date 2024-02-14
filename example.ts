import {Olmos} from "./olmos";
import {sql} from "./db";

interface PersonaSchema {
    nombre: string,
    cedula: string,
    cod_cargo: number
}

interface CargoSchema {
    cod_cargo: number,
    id_depto: number,
    nombre: string,
}

interface DeptoSchema {
    id_depto: number,
    nombre: string,
    telefono: string
}

type SchemaMap = {
    "Personas": PersonaSchema,
    "Cargos": CargoSchema,
}

class Persona{
    static model = Olmos.new<PersonaSchema, "Personas">("Personas", sql);
    fields: PersonaSchema;

    constructor(req: PersonaSchema){
        this.fields = req;
    }

    static async getOne(cedula: PersonaSchema["cedula"]){
        const fields = await Persona.model.getOne({"Personas.cedula": cedula});
        return new Persona(fields);
    }
    
    async save(){
        if (this.fields.cedula == undefined){
            await Persona.model.insert(this.fields);
        }else{
            await Persona.model.update(this.fields, {"Personas.cedula": this.fields.cedula});
        }
    }
}

async function main(){
    let persona = new Persona({
        nombre: "juan",
        cedula: "32142",
        cod_cargo: 2
    });
    const cargo = Olmos.new<CargoSchema, "Cargos">("Cargos", sql);

    const depto = Olmos.new<DeptoSchema, "Departamentos">("Departamentos", sql);
   
    const res2 = await Persona.model.getOne({}, ["Personas.nombre"]);

    const personasCargo = Persona.model.innerJoin(cargo, {
        "Personas.cod_cargo": "Cargos.cod_cargo"
    });
    
    const personasCargoDepto = personasCargo.innerJoin(depto, {
        "Cargos.id_depto": "Departamentos.id_depto"
    });

    const res = await personasCargoDepto.getOne({}, ["telefono", "id_depto"]);
    console.log(res);

    console.log(typeof persona);
    console.log(persona);
    await persona.save();
    console.log("Cedula:", persona.fields.cedula); // 1

    persona = await Persona.getOne("12345");
    console.log(persona);
    persona.fields.nombre = "jose";
    await persona.save();
    console.log("Nombre:", persona.fields.nombre); //"jose"
}

main().then(() => {
    console.log("terminado");
});
