import {Olmos, getSchema} from "./olmos";
import {sql} from "./db";

interface PersonaSchema {
    nombre: string,
    cedula: string,
    cod_cargo: number,
    telefono: number
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

class Persona{
    static model = Olmos.new<PersonaSchema, "Personas">("Personas", sql);
    fields: PersonaSchema;

    constructor(req: PersonaSchema){
        this.fields = req;
    }

    static async getOne(cedula: PersonaSchema["cedula"]){
        const fields = await Persona.model.getOne({"cedula": cedula});
        return new Persona(fields);
    }
    
    async save(){
        if (this.fields.cedula == undefined){
            await Persona.model.insert(this.fields);
        }else{
            await Persona.model.update(this.fields, {"cedula": this.fields.cedula});
        }
    }
}

async function main(){
    let persona = new Persona({
        nombre: "juan",
        cedula: "32142",
        cod_cargo: 2,
        telefono: 12345
    });
    const cargo = Olmos.new<CargoSchema, "Cargos">("Cargos", sql);

    const depto = Olmos.new<DeptoSchema, "Departamentos">("Departamentos", sql);
   
    const res2 = await Persona.model.getOne({}, ["nombre", "telefono"]);
    console.log(res2);

    const personasCargo = Persona.model.innerJoin(cargo, {
        "Cargos.cod_cargo": "Personas.cod_cargo"
    });
    type PersonasCargoSchema = getSchema<typeof personasCargo>;
    
    const personasCargoDepto = personasCargo.innerJoin(depto, {
        "Cargos.id_depto": "Departamentos.id_depto"
    });
    type PersonasCargoDeptoSchema = getSchema<typeof personasCargoDepto>;

    const res = await personasCargoDepto.getOne({}, ["Personas.nombre", "Cargos.cod_cargo", "Departamentos.telefono"]);
    console.log(res);

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
