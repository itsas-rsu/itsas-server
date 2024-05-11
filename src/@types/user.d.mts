// import type {ULID} from 'ulid';
export interface User {
    ulid: string;
    password: string;
}

export interface GoogleUser {
    ulid: string;
    userData: string;
    createDate: number;
}