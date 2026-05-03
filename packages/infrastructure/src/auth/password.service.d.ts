export declare class PasswordService {
    private saltRounds;
    constructor(saltRounds?: number);
    hash(password: string): Promise<string>;
    verify(password: string, hash: string): Promise<boolean>;
}
//# sourceMappingURL=password.service.d.ts.map