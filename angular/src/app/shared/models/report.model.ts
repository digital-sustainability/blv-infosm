export interface Report {
    diagnosis_date: string | Date;
    publication_date: string | Date;
    canton: string;
    munic: string;
    killed: number;
    infected: string;
    epidemic_group: string;
    epidemic: string;
    animal_group: string;
    animal_species: string;
    canton_id: number;
    munic_id: number;
    count: number;
}
