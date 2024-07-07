const comparation = {
    eq: "=",
    ls: "<",
    gt: ">"
} as const;
type Comparation = typeof comparation[keyof typeof comparation];

export class WhereCompleted<FieldType>{
    query: string;
    private fieldName: string;
    list: any[];

    constructor(fieldName: string, query: string, list: any[]){
        this.fieldName = fieldName;
        this.query = query;
        this.list = list;
    }

    and(){
        const w = new WhereIncompleted<FieldType>(this.fieldName, this.query, this.list);
        w.query += " AND ";
        return w;
    }

    or(){
        const w = new WhereIncompleted<FieldType>(this.fieldName, this.query, this.list);
        w.query += " OR ";
        return w;
    }
}

export class WhereIncompleted<FieldType> {
    query: string;
    private fieldName: string;
    private list: any[];
    
    constructor(fieldName: string, query: string = "WHERE ", list: any[] = []){
        this.fieldName = fieldName;
        this.query = query;
        this.list = list;
    }

    in(values: FieldType[]){
        const parseValues = values.map(_ => "?").join(", ");
        this.query += `(${this.fieldName}) IN (${parseValues})`;
        this.list.push(...values);

        return new WhereCompleted<FieldType>(this.fieldName, this.query, this.list);
    }

    isNull(){
        this.query += `${w.fieldName} IS NULL`;
        return new WhereCompleted<FieldType>(this.fieldName, this.query, this.list);
    }

    isNotNull(){
        this.query += `${this.fieldName} IS NOT NULL`;
        return new WhereCompleted<FieldType>(this.fieldName, this.query, this.list);
    }

    private compare(value: FieldType, type: Comparation){
        this.query += `${this.fieldName} ${type} ?`;
        this.list.push(value);

        return new WhereCompleted<FieldType>(this.fieldName, this.query, this.list);
    }
    
    lessEqual(value: FieldType){
        return this.compare(value, comparation.eq);
    }

    greaterEqual(value: FieldType){
        return this.compare(value, comparation.eq);
    }

    equal(value: FieldType){
        return this.compare(value, comparation.eq);
    }

    less(value: FieldType){
        return this.compare(value, comparation.ls);
    }

    greater(value: FieldType){
        return this.compare(value, comparation.gt);
    }
}

const w = new WhereIncompleted<string>("cedula");
const a = w.in(["1", "123", "458"]).and().isNull();
console.log(a);
