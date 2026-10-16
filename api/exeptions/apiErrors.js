class ApiErrors extends Error {
    constructor(status, message, errors = []) {
        super();
        this.status = status;
        this.message = message;
        this.errors = errors;
    }

    static UnauthorizedError() {
        return new ApiErrors(401, 'Пользователь не авторизован');
    }

    static BadRequest(message, errors = []) {
        return new ApiErrors(400, message, errors);
    }

    static NotFound(message = 'Не найдено') {
        return new ApiErrors(404, message);
    }
}

export default ApiErrors;