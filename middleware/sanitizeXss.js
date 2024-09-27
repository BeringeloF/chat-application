import xssFilters from "xss-filters";

/**
 * Função recursiva para filtrar XSS em objetos e arrays.
 * @param {object|string[]|object[]} maybeObj - O objeto ou array a ser sanitizado.
 * @return {object|string[]|object[]} - O objeto ou array sanitizado.
 */
const filterXss = (maybeObj) => {
  if (!Array.isArray(maybeObj)) {
    Object.keys(maybeObj).forEach((key) => {
      const value = maybeObj[key];
      if (typeof value === "string") {
        maybeObj[key] = xssFilters.inHTMLData(value);
      } else if (Array.isArray(value)) {
        filterXss(value);
      }
    });
  } else {
    return maybeObj.map((el) => {
      if (typeof el === "string") {
        return xssFilters.inHTMLData(el);
      } else if (typeof el === "object" && !Array.isArray(el)) {
        return filterXss(el);
      }
      return el; // Retorna o elemento original se não for string ou objeto
    });
  }

  return maybeObj;
};

/**
 * Middleware para sanitizar entradas contra XSS.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 * @param {function} next - Função para passar ao próximo middleware.
 */
export const sanitizeXss = (req, res, next) => {
  // Sanitizar todas as queries
  Object.keys(req.query).forEach((key) => {
    const value = req.query[key];
    if (typeof value === "string") {
      req.query[key] = xssFilters.inHTMLData(value);
    }
  });

  // Sanitizar todas as entradas no corpo da requisição
  if (req.body) {
    filterXss(req.body);
  }

  // Sanitizar todas as entradas nos parâmetros da URL
  Object.keys(req.params).forEach((key) => {
    const value = req.params[key];
    if (typeof value === "string") {
      req.params[key] = xssFilters.inHTMLData(value);
    }
  });

  next();
};
