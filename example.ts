import {Olmos, getSchema} from "./olmos";
import {sql} from "./db";

interface PersonaSchema {
    nombre: string,
    cedula: string,
    cod_cargo: number,
    telefono: number,
    password: string,
    cod_zona: number
}

interface ZonaSchema {
    cod_zona: number, 
    nombre: string
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
        const fields = await Persona.model.getOne({
            where: {"cedula": cedula}
        });
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
        cedula: "2043491978",
        cod_cargo: 2,
        telefono: 12345,
        password: "test",
        cod_zona: 1
    });
    const cargo = Olmos.new<CargoSchema, "Cargos">("Cargos", sql);
    const depto = Olmos.new<DeptoSchema, "Departamentos">("Departamentos", sql);
    const zona = Olmos.new<ZonaSchema, "Zonas">("Zonas", sql);

    const res2 = await Persona.model.getOne({
        fields: ["nombre", "telefono", "cedula"]}
    );
    console.log(res2.nombre);
    
    const personasCargo = Persona.model.innerJoin(cargo, {
        "Personas.cod_cargo": "Cargos.cod_cargo"
    });
    type PersonasCargoSchema = getSchema<typeof personasCargo>;
    
    const personasCargoDepto = personasCargo.innerJoin(depto, {
        "Cargos.id_depto": "Departamentos.id_depto"
    });
    type PersonasCargoDeptoSchema = getSchema<typeof personasCargoDepto>;

    /*const res = personasCargo.innerJoin(zona, {
        "Personas.cod_zona": "Zonas.cod_zona"
    }).insert({
        "Zonas.cod_zona": 1,
        "Personas.cod_cargo": 1,
        "Personas.nombre": "juan",
        "cedula": "12345",
        "telefono": 12345,
        "Cargos.nombre": "nuevo cargo",
        "Cargos.cod_cargo": 1
    });*/

    const res = await personasCargoDepto.getOne({
        where: {cedula: ['1', '2', '3', '4']},
        fields: ["Personas.nombre", "Cargos.cod_cargo", "Departamentos.telefono"]
    });
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
