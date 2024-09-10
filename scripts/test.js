
class Producto {
  constructor(nombre = "", descripcion = "", precio = 0, stock = 0, descuento = 0, imagen = "") {
    Object.assign(this, { nombre, descripcion, precio, stock, descuento, imagen });
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
    this.relaciones = new Map(); // Mapa para guardar las relaciones (producto => Set<categoria>)
    this.subcategorias = new Map(); // Mapa para guardar las subcategorias de las categorias (categoria => Set<categoria>)
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
  

  parsearCategoriasYSubcategorias(item, gestorCategorias, gestorProductos){ //item = {categoria:"", subcategorias: [ {categoria:"", productos: []} ]}
    let categoriaPrincipal = new Categoria(item.categoria);
    if (this.subcategorias.has(categoriaPrincipal))
      return false;

    gestorCategorias.aniadirCategoria(categoriaPrincipal)
    // debugger
    for (let set of item.subcategorias){
      const subcat = new Categoria(set.categoria)
      gestorCategorias.aniadirCategoria(subcat)
      this.nuevasSubcategoriasParaCategoria(categoriaPrincipal, subcat)
      for (let prod of set.productos) {
        gestorProductos.aniadirProducto(prod)
        this.nuevaRelacion(prod, subcat)
        this.nuevaRelacion(prod, categoriaPrincipal)
      }
    }
  }

  nuevasSubcategoriasParaCategoria(categoria, subcategorias) {
    if (!categoria || !subcategorias)
      return false;

    if (!Array.isArray(subcategorias))
      subcategorias = [subcategorias]
    
    if (this.subcategorias.has(categoria))
      subcategorias.forEach(cat => this.subcategorias.get(categoria).add(cat))
    else
      this.subcategorias.set(categoria, new Set(subcategorias))
  }

  obtenerSubcategorias(categoria) {
    return this.subcategorias.has(categoria) ? [...this.subcategorias.get(categoria)].map(subCat => this.#obtenerSucategorias(subCat)) : [];
  }

  #obtenerSucategorias(categoria) {
    if (!this.subcategorias.has(categoria))
      return categoria;
    return [...this.subcategorias.get(categoria)].map(cat => this.obtenerSubcategorias(cat)) /*.flat() */;
  }

  obtenerTodasSubcategorias() {
    return [...this.subcategorias]
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
  constructor(gestorCategorias = new GestorCategorias(), gestorProductos = new GestorProductos(), gestorRelaciones = new GestorRelaciones(), carrito = new Carrito()) {
    this.gestorCategorias = gestorCategorias;
    this.gestorProductos = gestorProductos;
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

  obtenerTodasLasCategoriasConSubcategorias() {
    return this.gestorRelaciones.obtenerTodasSubcategorias()
  }

  obtenerSubcategorias(categoria) {
    return this.gestorRelaciones.obtenerSubcategorias(categoria)
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

const openInterface = document.getElementById("temp-ui");

openInterface.addEventListener("click", runStore);

let tienda = cargarTienda(generarItems());

function runStore() {
  console.time()
  tienda.obtenerTodosLosProductos()
  tienda.obtenerTodasLasCategorias()
  tienda.obtenerSubcategorias(tienda.gestorCategorias.obtenerPorID(3))
  console.timeEnd()
  // alert("¡Bienvenido a mi Regaleria!\nPara interacturar utilizará los números de su teclado.\nA continuación se le mostrarán opciones.");
  // mainLoop(tienda);
}

function cargarTienda(items) {
  let gestorCategorias = new GestorCategorias()
  let gestorRelaciones = new GestorRelaciones()
  let gestorProductos = new GestorProductos()
  items.forEach((item) => gestorRelaciones.parsearCategoriasYSubcategorias(item, gestorCategorias, gestorProductos))
  return new Tienda(gestorCategorias, gestorProductos, gestorRelaciones)
}

function createDOMProduct(product) {
  const productsContainer = document.getElementById("products-container-main");
  const productDOM = document.createElement("article");
  productDOM.classList = "product";
  productDOM.innerHTML = 
  `<picture class='product-image-container'>
    <a href='#'><img src='assets/regaleria logo.webp' alt='imagen del producto'></img></a>
  </picture>
  <div class='product-title-container'>
    <a href='#'>${product.nombre}</a>
  </div>
  <div class='product-price-container'>
    <h3>${Intl.NumberFormat('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2,maximumFractionDigits: 2}).format(product.precio)}</h3>
  </div>
  <div class='product-addtocart-container'>
    <button alt='añadir al carrito'><svg  xmlns='http://www.w3.org/2000/svg'  width='24'  height='24'  viewBox='0 0 24 24'  fill='none'  stroke='currentColor'  stroke-width='2'  stroke-linecap='rou nd'  stro ke-linejoin='round'  class='icon icon-tabler icons-tabler-outline icon-tabler-shopping-bag-plus'><path stroke='none' d='M0 0h24v24H0z' fill='none'/><path d='M12.5 21h-3.926a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304h11.339a2 2 0 0 1 1.977 2.304l-.263 1.708' /><path d='M16 19h6' /><path d='M19 16v6' /><path d='M9 11v-5a3 3 0 0 1 6 0v5'/></svg></button>
  </div>`
  productsContainer.appendChild(productDOM);
}

createDOMProduct(tienda.gestorProductos.obtenerPorID(0))



function generarItems() {
  return [generarJueguetes(), generarPapeleria(), generarPlantasYFlores(), generarDecoracion(),generarRopaYAccesorios()]
}


function generarJueguetes () {
  const juguete1 = new Producto("Lego Classic", "Set de bloques de construcción clásico para estimular la creatividad y la imaginación.", 12500.485, 50);
  const juguete2 = new Producto("Muñeca Barbie", "Muñeca Barbie con accesorios y ropa intercambiable.", 8500.0, 30);
  const juguete3 = new Producto("Coche de Carreras Hot Wheels", "Vehículo de juguete a escala con diseño deportivo para carreras emocionantes.", 4000.0, 100);
  const juguete4 = new Producto("Pizarra Mágica", "Pizarra magnética para dibujar y borrar fácilmente, ideal para niños creativos.", 15000.0, 75);
  const juguete5 = new Producto("Puzzle de Animales", "Rompecabezas educativo de 24 piezas con ilustraciones de animales.", 4100.0, 40);
  const peluche1 = new Producto("Peluche Oso Panda", "Suave peluche en forma de oso panda, ideal para abrazar y decorar.", 5000.0, 60);
  const peluche2 = new Producto("Peluche Unicornio", "Peluche de unicornio con crin colorida y cuerno brillante.", 5000.0, 45);
  const peluche3 = new Producto("Peluche Elefante", "Tierno peluche de elefante con orejas grandes y cuerpo esponjoso.", 5000.0, 80);
  const peluche4 = new Producto("Peluche Dinosaurio", "Peluche de dinosaurio con detalles realistas y textura suave.", 5000.0, 70);
  const peluche5 = new Producto("Peluche Gato", "Peluche de gato con ojos grandes y pelaje suave, perfecto para niños y adultos.", 5000.0, 50);
  return {categoria: "Juguetes", subcategorias: [{categoria: "Juguetes Para Niños", productos: [juguete1, juguete2, juguete3, juguete4, juguete5]}, {categoria: "Peluches", productos: [peluche1, peluche2, peluche3, peluche4, peluche5]}]};
}

function generarPapeleria (){
  const cajaRegalo1 = new Producto("Caja de Regalo Pequeña - 15x10x5 cm", "Elegante caja de regalo de tamaño pequeño, ideal para joyería y pequeños recuerdos. Dimensiones: 15x10x5 cm.", 5.99, 100);
  const cajaRegalo2 = new Producto("Caja de Regalo Mediana - 25x20x10 cm", "Caja de regalo de tamaño mediano con un diseño clásico, perfecta para libros y artículos de tamaño moderado. Dimensiones: 25x20x10 cm.", 9.99, 75);
  const cajaRegalo3 = new Producto("Caja de Regalo Grande - 40x30x15 cm", "Gran caja de regalo con acabado lujoso, ideal para ropa o varios artículos grandes. Dimensiones: 40x30x15 cm.", 14.99, 50);
  const tarjeta1 = new Producto("Tarjeta de Cumpleaños - Flores y Globo", "Tarjeta de felicitación con diseño de flores y globo, ideal para cumpleaños. Incluye sobre.", 2.99, 200);
  const tarjeta2 = new Producto("Tarjeta de Felicitaciones - Bebé Recién Nacido", "Tierna tarjeta con ilustraciones de bebé y juguetes, perfecta para felicitar por la llegada de un nuevo miembro a la familia.", 3.49, 150);
  const tarjeta3 = new Producto("Tarjeta de Aniversario - Corazones y Oro", "Elegante tarjeta con detalles dorados y corazones, ideal para celebrar aniversarios. Incluye sobre decorativo.", 4.99, 100);
  const tarjeta4 = new Producto("Tarjeta de Graduación - Toga y Birrete", "Tarjeta de felicitaciones con diseño de toga y birrete, perfecta para graduaciones. Incluye espacio para mensaje personal.", 3.99, 120);
  return {categoria: "Papeleria", subcategorias: [{categoria: "Cajas de Regalos", productos:[cajaRegalo1, cajaRegalo2, cajaRegalo3]}, {categoria: "Tarjetas de Felicitaciones", productos:[tarjeta1, tarjeta2, tarjeta3]}]}
}

function generarPlantasYFlores() {
  const flor1 = new Producto("Ramo de Rosas Rojas", "Hermoso ramo de 12 rosas rojas frescas, ideal para ocasiones románticas. Las rosas están cuidadosamente seleccionadas para asegurar su calidad y frescura.", 24.99, 30);
  const flor2 = new Producto("Orquídea Blanca en Maceta", "Elegante orquídea blanca en una maceta decorativa, perfecta para regalar o decorar interiores. Esta planta es conocida por su durabilidad y belleza exótica.", 34.99, 20);
  const planta1 = new Producto("Palo de Brasil", "Planta de interior de fácil cuidado con hojas largas y verdes. Ideal para purificar el aire y decorar espacios. Altura aproximada: 60 cm.", 22.99, 40);
  const planta2 = new Producto("Sukulentas Variadas", "Colección de 4 suculentas diferentes en macetas pequeñas. Perfectas para el hogar o oficina, requieren poco riego y mantenimiento. Cada planta mide entre 5-10 cm.", 15.99, 60);
  const planta3 = new Producto("Planta de Lavanda en Maceta", "Planta de lavanda con fragancia natural, ideal para aromatizar interiores o jardines. Maceta incluida. Altura aproximada: 30 cm.", 18.49, 35);
  const planta4 = new Producto("Helecho de Boston", "Helecho de Boston con hojas frondosas y verdes. Excelente para interiores con buena humedad. Altura aproximada: 45 cm. Incluye maceta decorativa.", 27.99, 25);
  return {categoria: "Flores y Plantas", subcategorias: [{categoria: "Flores", productos:[flor1, flor2]}, {categoria: "Plantas", productos:[planta1, planta2, planta3, planta4]}]}
}

function generarDecoracion(){
  const accesorio1 = new Producto("Alfombra Moderna - 120x80 cm", "Alfombra moderna de diseño abstracto en tonos neutros, ideal para salones o habitaciones. Material suave y fácil de limpiar.", 49.99, 20);
  const accesorio2 = new Producto("Lámpara de Mesa con Base de Madera", "Lámpara de mesa elegante con base de madera y pantalla de lino. Perfecta para iluminar escritorios o mesas de noche.", 34.99, 25);
  const accesorio3 = new Producto("Reloj de Pared Retro", "Reloj de pared con diseño retro en estilo vintage, ideal para decorar cualquier habitación. Funciona con baterías.", 29.99, 15);
  const accesorio4 = new Producto("Cojines Decorativos - Set de 2", "Set de 2 cojines decorativos con fundas de algodón en colores vivos. Perfectos para añadir un toque de color y confort a tu sofá.", 22.99, 30);
  const accesorio5 = new Producto("Espejo de Pared con Marco Dorado", "Espejo de pared con marco dorado elegante, ideal para decorar pasillos o salas de estar. Dimensiones: 60x40 cm.", 59.99, 10);
  const accesorio6 = new Producto("Portavelas de Cristal", "Portavelas de cristal con diseño elegante y moderno. Ideal para crear un ambiente acogedor en cualquier habitación. Incluye velas.", 14.99, 40);
  return {categoria: "Decoracion", subcategorias: [{categoria: "Accesorios de Hogar", productos:[accesorio1, accesorio2, accesorio3, accesorio4, accesorio5, accesorio6]}]}
}

function generarRopaYAccesorios() {
  const arito1 = new Producto("Aritos de Plata con Zirconia", "Aritos de plata esterlina con piedras de zirconia cúbica, diseño clásico y elegante. Ideal para el uso diario o ocasiones especiales.", 29.99, 50);
  const arito2 = new Producto("Aritos de Oro Rosa - 18K", "Aritos de oro rosa de 18 quilates con un acabado pulido. Diseño moderno y sofisticado, perfecto para combinar con cualquier atuendo.", 79.99, 25);
  const arito3 = new Producto("Aritos de Acero Inoxidable con Perla", "Aritos de acero inoxidable con perlas falsas, ofreciendo un look chic y duradero. Resistente al agua y a la corrosión, ideal para el uso diario.", 15.99, 75);
  const collar1 = new Producto("Collar de Plata con Colgante de Corazón", "Elegante collar de plata esterlina con colgante en forma de corazón. Perfecto para ocasiones románticas y como regalo especial. Longitud de cadena: 45 cm.", 39.99, 30);
  const collar2 = new Producto("Collar de Oro con Perlas Naturales", "Collar de oro de 18 quilates con perlas naturales. Diseño clásico y sofisticado, ideal para eventos formales y ocasiones especiales. Longitud de cadena: 50 cm.", 129.99, 20);
  const sombrero1 = new Producto("Sombrero de Paja - Estilo Panamá", "Sombrero de paja estilo Panamá, ligero y ventilado, ideal para protegerse del sol durante el verano. Talla ajustable.", 29.99, 40);
  const sombrero2 = new Producto("Sombrero de Lana - Fedora", "Sombrero de lana en estilo Fedora, elegante y cálido, perfecto para el otoño e invierno. Disponible en varios colores. Talla única.", 49.99, 25);
  const sombrero3 = new Producto("Gorra Deportiva - Ajustable", "Gorra deportiva de algodón con visera curva y ajuste trasero. Ideal para actividades al aire libre y deportes. Disponible en varios colores.", 19.99, 60);
  const mochila1 = new Producto("Mochila de Senderismo - 30L", "Mochila de senderismo de 30 litros con múltiples compartimentos y correas acolchadas para mayor comodidad. Ideal para excursiones y caminatas.", 69.99, 25);
  const mochila2 = new Producto("Mochila Escolar - Diseño Juvenil", "Mochila escolar con diseño juvenil y colorido, ideal para estudiantes. Incluye varios compartimentos y correas ajustables. Dimensiones: 40x30x15 cm.", 34.99, 40);
  const mochila3 = new Producto("Mochila de Laptop - 15.6 pulgadas", "Mochila para laptop con compartimento acolchado para computadoras de hasta 15.6 pulgadas. Diseñada para el trabajo o estudios, con múltiples bolsillos para accesorios.", 59.99, 30);
  const mochila4 = new Producto("Mochila Casual - Cuero Sintético", "Mochila casual de cuero sintético con un diseño elegante y moderno. Ideal para uso diario y ocasiones informales. Dimensiones: 35x25x10 cm.", 49.99, 20);
  const cartera1 = new Producto("Cartera de Cuero - Clásica", "Cartera de cuero genuino con compartimentos para tarjetas y billetes. Diseño clásico y elegante, disponible en varios colores. Dimensiones: 20x10 cm.", 79.99, 15);
  const cartera2 = new Producto("Cartera de Tela - Compacta", "Cartera compacta de tela con diseño moderno y práctico. Incluye compartimentos para tarjetas y monedas. Ideal para uso diario. Dimensiones: 15x9 cm.", 24.99, 40);
  return {categoria: "Ropa y Accesorios", subcategorias: [{categoria: "Aritos", productos:[arito1, arito2, arito3]}, {categoria: "Collares", productos:[collar1, collar2]}, {categoria: "Sombreros", productos:[sombrero1, sombrero2, sombrero3]}, {categoria: "Mochilas", productos:[mochila1, mochila2, mochila3, mochila4]}, {categoria: "Carteras", productos:[cartera1, cartera2]}]}
}
