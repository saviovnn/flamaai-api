// Suprimir logs de erro do NestJS durante os testes
// Apenas suprimir console.error, sem mockar o Logger (que quebra o NestJS Testing)
const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  // Suprimir apenas console.error para não mostrar logs de erro
  console.error = jest.fn();
  // Opcional: também suprimir console.log se necessário
  // console.log = jest.fn();
});

afterAll(() => {
  // Restaurar console original após os testes
  console.error = originalError;
  console.log = originalLog;
});
