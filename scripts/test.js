
class Producto {
  constructor(nombre = "", descripcion = "", precio = 0, stock = 0, descuento = 0) {
    Object.assign(this, { nombre, descripcion, precio, stock, descuento });
  }

  operarStock(cantidad){
    if (cantidad < 0 && Math.abs(cantidad) > this.stock) //no se le puede restar mas de lo que hay de stock, siempre tendra un valor positivo o 0
      return -1;
    this.stock = this.stock + cantidad;  
    return this.stock;
  }

  precioConDescuento(){
    if (this.descuento < 0)
      return this.precio
    return (this.precio * ((100 - this.descuento) / 100))
  }
}

class Categoria {
  constructor(nombre = "") {
    Object.assign(this, { nombre });
  }

  cambiarNombre(nuevoNombre){
    if (nuevoNombre)
      this.nombre = nuevoNombre;
    return this.nombre
  }
}

class Gestor {
  constructor(valores = []){
    const [nuevosValores, idValores] = this.#inicializar(valores)
    this.valores = nuevosValores;
    this.idValores = idValores;
    this.idActual = valores.length - 1;
  }

  #inicializar(valores = []) {
    if (!valores)
      return [new Map(), new Map()]

    let nuevosValores = new Map();
    let idValores = new Map();
    valores.forEach((valor, index) => {
      nuevosValores.set(index, valor);
      idValores.set(valor, index);
    })
    return [nuevosValores, idValores]
  }

  existeID(id) {
    return this.valores.has(id);
  }

  existe(valor) {
    return this.idValores.has(valor);
  }

  #siguienteID() {
    do {
      this.idActual++;
    } while (this.existeID(this.idActual));
    return this.idActual;
  }

  actualizarIDValores(valor, nuevoValor) {
    if (!this.idValores.has(valor))
      return false;
    const id = this.idValores.get(valor);
    this.idValores.delete(valor)
    this.idValores.set(nuevoValor, id);
    return true;
  }

  aniadir(valores = []) {
    if (!Array.isArray(valores))  //en caso de que se ingrese UN valor no estando en un array
      valores = [valores];
    let ids = [];
    valores.forEach((value) => {
      const id = this.#siguienteID();
      this.valores.set(id, value);
      this.idValores.set(value, id);
      ids.push(id);
    });
    return ids.length > 1 ? ids : ids[0];   //si hay multiples ids devuelve la lista, sino devuela la unica id
  }

  obtenerTodosValores() {
    return [...this.valores.values()];
  }

  obtenerPorID(id) {
    return this.valores.get(id);
  }

  obtenerID(valor) {
    return this.idValores.get(valor);
  }

}

class GestorProductos extends Gestor {
  constructor(productos = []){
    super(productos)
  }

  aniadirProducto(producto) {
    return this.aniadir(producto)
  }

  actualizarProducto(id, nuevoProducto) {
    if (!this.existeID(id)) 
      return false;
    this.actualizarIDValores(this.valores.get(id), nuevoProducto)
    this.valores.set(id, nuevoProducto)
    return true;
  }

  modificarStock(id, cantidad) {
    let producto = this.obtenerPorID(id);
    const productoViejo = producto;
    if (producto){
      if (producto.operarStock(cantidad) === -1)
        return false;
      this.actualizarProducto(id, producto);
      this.actualizarIDValores(productoViejo, producto)
    }
    return producto;
  }

  obtenerTodosProductos(){
    return this.obtenerTodosValores();
  }
}

class GestorCategorias extends Gestor {
  constructor(categorias = []){
    super(categorias)
  }

  aniadirCategoria(categoria){
    return this.aniadir(categoria);
  }

  cambiarNombre(id, nuevoNombre) {
    let categoria = this.obtenerPorID(id);
    const categoriaVieja = categoria;
    if (categoria) {
      categoria.cambiarNombre(nuevoNombre);
      this.actualizarIDValores(categoriaVieja, categoria);
      this.valores.set(id, categoria);
    }
    return categoria;
  }

  obtenerTodasCategorias(){
    return this.obtenerTodosValores();
  }
}

class GestorRelaciones {
  constructor() {
    this.relaciones = new Map(); // Mapa para guardar las relaciones (productoId => Set<categoriaId>)
  }

  nuevaRelacion(producto, categoria) {
    if (!this.relaciones.has(producto))
      this.relaciones.set(producto, new Set());
    this.relaciones.get(producto).add(categoria);
  }

  removerRelacion(producto, categoria) {
    if (this.relaciones.has(producto)) {
      this.relaciones.get(producto).delete(categoria);
      if (this.relaciones.get(producto).size === 0) // Eliminar la entrada del mapa si el set está vacío
        this.relaciones.delete(producto);
      return true;
    }
    return false;
  }

  obtenerCategorias(producto) {
    return this.relaciones.has(producto) ? [...this.relaciones.get(producto)] : [];
  }

  obtenerProductos(categoria) {
    return [...this.relaciones.entries()]
    .filter(productoCategorias => productoCategorias[1].has(categoria))
    .map(res => res[0])
  }

  obtenerRelaciones() {
    return [...this.relaciones]
  }

  obtenerRelacionesPorCategoria() {
    //todo
  }

}

class Carrito {
  constructor() {
    this.itemsCarrito = new Map();
  }

  aniadirProducto(producto, cantidad = 1) {
    if (!producto)
      return 0;

    let cantidadActual = this.itemsCarrito.get(producto) || 0;
    if (cantidad < 1)
      return cantidadActual;
    if (cantidad > producto.stock)
      return false;

    const nuevaCantidad = cantidadActual + cantidad;
    this.itemsCarrito.set(producto, nuevaCantidad);
    return nuevaCantidad;
  }

  removerProducto(producto, cantidad = 1) {
    if (!producto)
      return 0;
    let cantidadActual = this.itemsCarrito.get(producto) || 0;
    if (cantidad < 1)
      return cantidadActual;
    const nuevaCantidad = Math.max(cantidadActual - cantidad, 0);
    this.itemsCarrito.set(producto, nuevaCantidad);
    return nuevaCantidad;
  }

  #calcularPrecio(item, acc) {
    return (item[0].precioConDescuento() * item[1]) + acc
  }

  calcularPrecioFinal(){
    return [...this.itemsCarrito.entries()].reduce((acc, item) => this.#calcularPrecio(item, acc) , 0).toFixed(2)
  }

  #itemizar(item) {
    return {producto: item[0], cantidad: item[1]}
  }

  obtenerCarrito() {
    return [...this.itemsCarrito].map(value => this.#itemizar(value))
  }

  finalizarCompra(tienda = new Tienda()) {
    let tiendaModificada = tienda;
    let compraValida = [...this.itemsCarrito.entries()].every((item) => {
      item = this.#itemizar(item);
      return tiendaModificada.gestorProductos.modificarStock(tiendaModificada.gestorProductos.obtenerID(item.producto), item.cantidad * -1)
    })

    return compraValida ? tiendaModificada.gestorProductos : false
  }
}

class Tienda {  // se puede crear una tienda sin llenar el constructor O con (categorias, productos)
  constructor(categorias = [], productos = [], gestorRelaciones = new GestorRelaciones(), carrito = new Carrito()) {
    this.gestorCategorias = new GestorCategorias(categorias);
    this.gestorProductos = new GestorProductos(productos);
    this.gestorRelaciones = gestorRelaciones;
    this.carrito = carrito;
  }

  nuevoProducto(producto) {
    return this.gestorProductos.aniadirProducto(producto);
  }

  ingresarProductos(productos) {    //recibe un array de Productos
    return this.nuevoProducto(productos);
  }

  ingresarStockAlActual(producto, stock) {
    if (stock < 1 || !this.gestorProductos.existe(producto))
      return false
    return this.gestorProductos.modificarStock(this.gestorProductos.obtenerID(producto), stock);
  }

  nuevoStock(producto, stock) {
    if (!this.gestorProductos.existe(producto))
      return false

    this.gestorProductos
    return true;
  }

  nuevaCategoria(categoria) {
    return this.gestorCategorias.aniadirCategoria(categoria);
  }

  ingresarCategorias(categorias) {   //recibe un array de Categorias
    return this.nuevaCategoria(categorias);
  }

  nuevaCategoriaAProducto(producto, categoria) {
    this.gestorRelaciones.nuevaRelacion(producto, categoria)
  }

  categoriasDeProducto(producto) {
    return this.gestorRelaciones.obtenerCategorias(producto);
  }

  productosDeCategoria(categoria) {
    return this.gestorRelaciones.obtenerProductos(categoria);
  }

  obtenerTodosLosProductos() {
    return this.gestorProductos.obtenerTodosProductos();
  }

  obtenerTodasLasCategorias() {
    return this.gestorCategorias.obtenerTodasCategorias();
  }

  obtenerTodasLasRelaciones() {
    return this.gestorRelaciones.obtenerRelaciones();
  }

  obtenerCarrito() {
    return this.carrito.obtenerCarrito();
  }

  obtenerPrecioFinal() {
    return this.carrito.calcularPrecioFinal();
  }

  ingresarProductoAlCarrito(producto, cantidad) {
    this.carrito.aniadirProducto(producto, cantidad);
  }

  finalizarCompra() {
    let productosActualizados = this.carrito.finalizarCompra(this)
    if (!productosActualizados)
      return false;
    this.gestorProductos = productosActualizados;
    this.carrito.itemsCarrito.clear()
    return true;
  }

}

const categoria1 = new Categoria("Ropa");
const categoria2 = new Categoria("Calzado");
const categoria3 = new Categoria("Accesorios");
const categoria4 = new Categoria("Deportes");
const categoria5 = new Categoria("Ofertas");
const categoria6 = new Categoria("Ofertones");

const producto1 = new Producto("Camisa", "Camisa de algodón de manga larga", 25.99, 50, 10);
const producto2 = new Producto("Pantalón", "Pantalón de mezclilla ajustado", 45.5, 30, 15);
const producto3 = new Producto("Zapatos deportivos", "Zapatos ligeros y cómodos para correr", 60.0, 20, 5);
const producto4 = new Producto("Chaqueta", "Chaqueta impermeable con capucha", 80.99, 15, 20);
const producto5 = new Producto("Gorra", "Gorra ajustable con protección UV", 12.75, 100, 0);

let tienda = new Tienda([categoria1, categoria2, categoria3, categoria4, categoria5], [producto1, producto2, producto3, producto4, producto5]);




function generateClothingAndAccesories() {
  const arito1 = new Producto(
    "Aritos de Plata con Zirconia",
    "Aritos de plata esterlina con piedras de zirconia cúbica, diseño clásico y elegante. Ideal para el uso diario o ocasiones especiales.",
    29.99,
    50
  );
  const arito2 = new Producto(
    "Aritos de Oro Rosa - 18K",
    "Aritos de oro rosa de 18 quilates con un acabado pulido. Diseño moderno y sofisticado, perfecto para combinar con cualquier atuendo.",
    79.99,
    25
  );
  const arito3 = new Producto(
    "Aritos de Acero Inoxidable con Perla",
    "Aritos de acero inoxidable con perlas falsas, ofreciendo un look chic y duradero. Resistente al agua y a la corrosión, ideal para el uso diario.",
    15.99,
    75
  );

  const collar1 = new Producto(
    "Collar de Plata con Colgante de Corazón",
    "Elegante collar de plata esterlina con colgante en forma de corazón. Perfecto para ocasiones románticas y como regalo especial. Longitud de cadena: 45 cm.",
    39.99,
    30
  );
  const collar2 = new Producto(
    "Collar de Oro con Perlas Naturales",
    "Collar de oro de 18 quilates con perlas naturales. Diseño clásico y sofisticado, ideal para eventos formales y ocasiones especiales. Longitud de cadena: 50 cm.",
    129.99,
    20
  );

  const sombrero1 = new Producto(
    "Sombrero de Paja - Estilo Panamá",
    "Sombrero de paja estilo Panamá, ligero y ventilado, ideal para protegerse del sol durante el verano. Talla ajustable.",
    29.99,
    40
  );
  const sombrero2 = new Producto(
    "Sombrero de Lana - Fedora",
    "Sombrero de lana en estilo Fedora, elegante y cálido, perfecto para el otoño e invierno. Disponible en varios colores. Talla única.",
    49.99,
    25
  );
  const sombrero3 = new Producto(
    "Gorra Deportiva - Ajustable",
    "Gorra deportiva de algodón con visera curva y ajuste trasero. Ideal para actividades al aire libre y deportes. Disponible en varios colores.",
    19.99,
    60
  );

  const mochila1 = new Producto(
    "Mochila de Senderismo - 30L",
    "Mochila de senderismo de 30 litros con múltiples compartimentos y correas acolchadas para mayor comodidad. Ideal para excursiones y caminatas.",
    69.99,
    25
  );
  const mochila2 = new Producto(
    "Mochila Escolar - Diseño Juvenil",
    "Mochila escolar con diseño juvenil y colorido, ideal para estudiantes. Incluye varios compartimentos y correas ajustables. Dimensiones: 40x30x15 cm.",
    34.99,
    40
  );
  const mochila3 = new Producto(
    "Mochila de Laptop - 15.6 pulgadas",
    "Mochila para laptop con compartimento acolchado para computadoras de hasta 15.6 pulgadas. Diseñada para el trabajo o estudios, con múltiples bolsillos para accesorios.",
    59.99,
    30
  );
  const mochila4 = new Producto(
    "Mochila Casual - Cuero Sintético",
    "Mochila casual de cuero sintético con un diseño elegante y moderno. Ideal para uso diario y ocasiones informales. Dimensiones: 35x25x10 cm.",
    49.99,
    20
  );

  const cartera1 = new Producto(
    "Cartera de Cuero - Clásica",
    "Cartera de cuero genuino con compartimentos para tarjetas y billetes. Diseño clásico y elegante, disponible en varios colores. Dimensiones: 20x10 cm.",
    79.99,
    15
  );
  const cartera2 = new Producto(
    "Cartera de Tela - Compacta",
    "Cartera compacta de tela con diseño moderno y práctico. Incluye compartimentos para tarjetas y monedas. Ideal para uso diario. Dimensiones: 15x9 cm.",
    24.99,
    40
  );

  const earrings = new Categoria("Aritos", [arito1, arito2, arito3]);
  const necklaces = new Categoria("Collares", [collar1, collar2]);
  const hats = new Categoria("Sombreros", [sombrero1, sombrero2, sombrero3]);
  const backpacks = new Categoria("Mochilas", [mochila1, mochila2, mochila3, mochila4]);
  const handbags = new Categoria("Carteras", [cartera1, cartera2]);
  const handbags2 = new Categoria("Carteras2", [cartera1, cartera2], [earrings, necklaces, hats, backpacks, handbags]);

  return new Categoria("Ropa y Accesorios", [], [earrings, necklaces, hats, backpacks, handbags, handbags2]);
}

// console.time("tiempo")
// let res = generateClothingAndAccesories().getAllProducts()
// console.timeEnd("tiempo")
