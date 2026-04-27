class Usuario {
    #password; 
    constructor(id, nombre, apellido, email, password, role) {
        this.id = id;  // ID único de MockAPI
        this.nombre = nombre;
        this.apellido = apellido;
        this.role = role;  // 'ADMIN' o 'USUARIO'
        this.email = email;
        this.#password = password;
    }

    getRole() {
        return this.role;
    }

    verifyPassword(inputPassword) {
        return this.#password === inputPassword;
    }

    // Método para cambiar password (solo para ADMIN, pero lo chequeamos en script.js)
//    changePassword(newPassword) {
//        this.#password = newPassword;
//    }
}

export { Usuario };