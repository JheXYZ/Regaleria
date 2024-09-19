import { productosJSON } from "../data/productos.js";

class Producto {
  constructor(nombre = "", descripcion = "", precio = 0, stock = 0, descuento = 0, imagen = "") {
    Object.assign(this, { nombre, descripcion, precio, stock, descuento, imagen });
  }

  operarStock(cantidad) {
    if (cantidad < 0 && Math.abs(cantidad) > this.stock)
      //no se le puede restar mas de lo que hay de stock, siempre tendra un valor positivo o 0
      return -1;
    this.stock = this.stock + cantidad;
    return this.stock;
  }

  precioConDescuento() {
    if (this.descuento < 0) return this.precio;
    return this.precio * ((100 - this.descuento) / 100);
  }

  static parsearProductoDeJSON(producto) {
    //producto es un objeto que fue parseado de JSON
    return new Producto(producto.nombre, producto.descripcion, producto.precio, producto.stock, producto?.descuento, producto?.imagen);
  }
}

class Categoria {
  constructor(nombre = "") {
    Object.assign(this, { nombre });
  }

  cambiarNombre(nuevoNombre) {
    if (nuevoNombre) this.nombre = nuevoNombre;
    return this.nombre;
  }
}

class Gestor {
  constructor(valores = []) {
    const [nuevosValores, idValores] = this.#inicializar(valores);
    this.valores = nuevosValores;
    this.idValores = idValores;
    this.idActual = valores.length - 1;
  }

  #inicializar(valores = []) {
    if (!valores) return [new Map(), new Map()];

    let nuevosValores = new Map();
    let idValores = new Map();
    valores.forEach((valor, index) => {
      nuevosValores.set(index, valor);
      idValores.set(valor, index);
    });
    return [nuevosValores, idValores];
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
    if (!this.idValores.has(valor)) return false;
    const id = this.idValores.get(valor);
    this.idValores.delete(valor);
    this.idValores.set(nuevoValor, id);
    return true;
  }

  aniadir(valores = []) {
    if (!Array.isArray(valores))
      //en caso de que se ingrese UN valor no estando en un array
      valores = [valores];
    let ids = [];
    valores.forEach((value) => {
      const id = this.#siguienteID();
      this.valores.set(id, value);
      this.idValores.set(value, id);
      ids.push(id);
    });
    return ids.length > 1 ? ids : ids[0]; //si hay multiples ids devuelve la lista, sino devuela la unica id
  }

  obtenerTodosValores() {
    return [...this.valores.values()];
  }

  obtenerTodosValoresConID() {
    return [...this.valores.entries()];
  }

  obtenerPorID(id) {
    return this.valores.get(id);
  }

  obtenerID(valor) {
    return this.idValores.get(valor);
  }

  obtenerCantidadDeValores() {
    return this.valores.length;
  }
}

class GestorProductos extends Gestor {
  constructor(productos = []) {
    super(productos);
  }

  aniadirProducto(producto) {
    return this.aniadir(producto);
  }

  actualizarProducto(id, nuevoProducto) {
    if (!this.existeID(id)) return false;
    this.actualizarIDValores(this.valores.get(id), nuevoProducto);
    this.valores.set(id, nuevoProducto);
    return true;
  }

  parsearYAniadirProducto(producto = { nombre: "", descripcion: "", precio: 0, stock: 0, descuento: 0, imagen: "" }) {
    const productoFinal = Producto.parsearProductoDeJSON(producto);
    this.aniadir(productoFinal);
    return productoFinal;
  }

  modificarStock(id, cantidad) {
    let producto = this.obtenerPorID(id);
    if (producto) {
      if (producto.operarStock(cantidad) === -1) return false;
      const productoViejo = producto;
      this.actualizarProducto(id, producto);
      this.actualizarIDValores(productoViejo, producto);
    }
    return producto;
  }

  obtenerTodosProductos() {
    return this.obtenerTodosValores();
  }

  obtenerTodosProductosConIDs() {
    return this.obtenerTodosValoresConID();
  }
}

class GestorCategorias extends Gestor {
  constructor(categorias = []) {
    super(categorias);
  }

  aniadirCategoria(categoria) {
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

  obtenerTodasCategorias() {
    return this.obtenerTodosValores();
  }
}

class GestorRelaciones {
  constructor() {
    this.relaciones = new Map(); // Mapa para guardar las relaciones (producto => Set<categoria>)
    this.subcategorias = new Map(); // Mapa para guardar las subcategorias de las categorias (categoria => Set<categoria>)
  }

  nuevaRelacion(producto, categoria) {
    if (!this.relaciones.has(producto)) this.relaciones.set(producto, new Set());
    this.relaciones.get(producto).add(categoria);
  }

  removerRelacion(producto, categoria) {
    if (this.relaciones.has(producto)) {
      this.relaciones.get(producto).delete(categoria);
      if (this.relaciones.get(producto).size === 0)
        // Eliminar la entrada del mapa si el set está vacío
        this.relaciones.delete(producto);
      return true;
    }
    return false;
  }

  parsearCategoriasYSubcategorias(item, gestorCategorias, gestorProductos) {
    //item = {categoria:"", subcategorias: [ {categoria:"", productos: []} ]}
    let categoriaPrincipal = new Categoria(item.categoria);
    if (this.subcategorias.has(categoriaPrincipal)) return false;

    gestorCategorias.aniadirCategoria(categoriaPrincipal);
    // debugger
    for (let set of item.subcategorias) {
      const subcat = new Categoria(set.categoria);
      gestorCategorias.aniadirCategoria(subcat);
      this.nuevasSubcategoriasParaCategoria(categoriaPrincipal, subcat);
      for (let prodObject of set.productos) {
        const prod = gestorProductos.parsearYAniadirProducto(prodObject);
        this.nuevaRelacion(prod, subcat);
        this.nuevaRelacion(prod, categoriaPrincipal);
      }
    }
  }

  nuevasSubcategoriasParaCategoria(categoria, subcategorias) {
    if (!categoria || !subcategorias) return false;

    if (!Array.isArray(subcategorias)) subcategorias = [subcategorias];

    if (this.subcategorias.has(categoria)) subcategorias.forEach((cat) => this.subcategorias.get(categoria).add(cat));
    else this.subcategorias.set(categoria, new Set(subcategorias));
  }

  obtenerSubcategorias(categoria) {
    return this.subcategorias.has(categoria) ? [...this.subcategorias.get(categoria)].map((subCat) => this.#obtenerSucategorias(subCat)) : [];
  }

  #obtenerSucategorias(categoria) {
    if (!this.subcategorias.has(categoria)) return categoria;
    return [...this.subcategorias.get(categoria)].map((cat) => this.obtenerSubcategorias(cat)) /*.flat() <- solo de prueba */;
  }

  obtenerTodasSubcategorias() {
    return [...this.subcategorias];
  }

  obtenerCategorias(producto) {
    return this.relaciones.has(producto) ? [...this.relaciones.get(producto)] : [];
  }

  obtenerProductos(categoria) {
    return [...this.relaciones.entries()].filter((productoCategorias) => productoCategorias[1].has(categoria)).map((res) => res[0]);
  }

  obtenerRelaciones() {
    return [...this.relaciones];
  }

  obtenerRelacionesPorCategoria() {
    //todo
  }
}

class Carrito {
  constructor(itemsCarrito = new Map()) {
    this.itemsCarrito = itemsCarrito;
  }

  aniadirProducto(id = 0, cantidad = 1, gestorProductos = new GestorProductos()) {
    const producto = gestorProductos.obtenerPorID(id);
    if (!producto) return false;
    const cantidadActual = this.itemsCarrito.get(id) || 0;
    if (cantidad < 1) return cantidadActual;
    if (cantidad > producto.stock) return false;

    const nuevaCantidad = cantidadActual + cantidad;
    if (nuevaCantidad > gestorProductos.obtenerPorID(id).stock) return false;
    this.itemsCarrito.set(id, nuevaCantidad);
    this.actualizarCarrito();
    return nuevaCantidad;
  }

  removerProducto(id, cantidad = 1) {
    if (!id) return false;
    const cantidadActual = this.itemsCarrito.get(id) || 0;
    if (cantidad < 1) return cantidadActual;
    const nuevaCantidad = Math.max(cantidadActual - cantidad, 0);
    if (!nuevaCantidad) this.itemsCarrito.delete(id);
    else this.itemsCarrito.set(id, nuevaCantidad);
    this.actualizarCarrito();
    return nuevaCantidad;
  }

  #calcularPrecio([id, cantidad], acc, gestorProductos) {
    return gestorProductos.obtenerPorID(id).precioConDescuento() * cantidad + acc;
  }

  calcularPrecioFinal(gestorProductos = new GestorProductos()) {
    return [...this.itemsCarrito.entries()].reduce((acc, item) => this.#calcularPrecio(item, acc, gestorProductos), 0).toFixed(2);
  }

  #itemizar([id, cantidad], gestorProductos) {
    return { producto: gestorProductos.obtenerPorID(id), cantidad: cantidad };
  }

  obtenerCarrito(gestorProductos = new GestorProductos()) {
    return [...this.itemsCarrito].map((value) => this.#itemizar(value, gestorProductos));
  }

  finalizarCompra(tienda = new Tienda()) {
    let tiendaModificada = tienda;
    let compraValida = [...this.itemsCarrito.entries()].every(([id, cantidad]) => {
      return tiendaModificada.gestorProductos.modificarStock(id, cantidad * -1); // se multiplica por -1 a cantidad por que se está restando la cantidad al stock (modificarStock() soporta suma y resta)
    });

    return compraValida ? tiendaModificada.gestorProductos : false;
  }

  actualizarCarrito() {
    localStorage.setItem("regaleria-carrito", JSON.stringify([...this.itemsCarrito.entries()]));
  }
}

class Tienda {
  // se puede crear una tienda sin llenar el constructor O con (categorias, productos)
  constructor(gestorCategorias = new GestorCategorias(), gestorProductos = new GestorProductos(), gestorRelaciones = new GestorRelaciones(), carrito = new Carrito()) {
    this.gestorCategorias = gestorCategorias;
    this.gestorProductos = gestorProductos;
    this.gestorRelaciones = gestorRelaciones;
    this.carrito = carrito;
  }

  nuevoProducto(producto) {
    return this.gestorProductos.aniadirProducto(producto);
  }

  ingresarProductos(productos) {
    //recibe un array de Productos
    return this.nuevoProducto(productos);
  }

  ingresarStockAlActual(producto, stock) {
    if (stock < 1 || !this.gestorProductos.existe(producto)) return false;
    return this.gestorProductos.modificarStock(this.gestorProductos.obtenerID(producto), stock);
  }

  nuevoStock(producto, stock) {
    if (!this.gestorProductos.existe(producto)) return false;

    this.gestorProductos;
    return true;
  }

  nuevaCategoria(categoria) {
    return this.gestorCategorias.aniadirCategoria(categoria);
  }

  ingresarCategorias(categorias) {
    //recibe un array de Categorias
    return this.nuevaCategoria(categorias);
  }

  nuevaCategoriaAProducto(producto, categoria) {
    this.gestorRelaciones.nuevaRelacion(producto, categoria);
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

  obtenerTodosLosProductosConIDs() {
    return this.gestorProductos.obtenerTodosProductosConIDs();
  }

  obtenerTodasLasCategorias() {
    return this.gestorCategorias.obtenerTodasCategorias();
  }

  obtenerTodasLasCategoriasConSubcategorias() {
    return this.gestorRelaciones.obtenerTodasSubcategorias();
  }

  obtenerSubcategorias(categoria) {
    return this.gestorRelaciones.obtenerSubcategorias(categoria);
  }

  obtenerTodasLasRelaciones() {
    return this.gestorRelaciones.obtenerRelaciones();
  }

  obtenerCarrito() {
    return this.carrito.obtenerCarrito(this.gestorProductos);
  }

  obtenerPrecioFinal() {
    return this.carrito.calcularPrecioFinal();
  }

  ingresarProductoAlCarrito(id, cantidad) {
    return this.carrito.aniadirProducto(id, cantidad, this.gestorProductos);
  }

  finalizarCompra() {
    let productosActualizados = this.carrito.finalizarCompra(this);
    if (!productosActualizados) return false;
    this.gestorProductos = productosActualizados;
    this.carrito.itemsCarrito.clear();
    this.carrito.actualizarCarrito();
    return true;
  }
}

function cargarItems() {
  return productosJSON; // por ahora es un archivo js pero luego cuando podamos usar JSON como archivos, lo usaré
}

function cargarTienda(items) {
  let gestorCategorias = new GestorCategorias();
  let gestorRelaciones = new GestorRelaciones();
  let gestorProductos = new GestorProductos();
  items.forEach((item) => gestorRelaciones.parsearCategoriasYSubcategorias(item, gestorCategorias, gestorProductos));
  const itemsCarrito = localStorage.getItem("regaleria-carrito");
  let carrito;
  // debugger
  if (itemsCarrito) {
    const listaProductos = JSON.parse(itemsCarrito); // esto devuelve [[id, cantidad], ...]
    // aqui se parsean los productos a clase Producto, el Map es key: id, value: cantidad de producto
    carrito = new Carrito(new Map(listaProductos.map(([id, cantidad]) => [id, cantidad])));
  } else carrito = new Carrito();
  return new Tienda(gestorCategorias, gestorProductos, gestorRelaciones, carrito);
}

function crearProductoHTML(producto, id) {
  const productDOM = document.createElement("article");
  productDOM.classList.add("product");

  // Crear la estructura del <picture>
  const picture = document.createElement("picture");
  picture.classList.add("product-image-container");

  const productLink = document.createElement("a");
  productLink.href = `./pages/product.html?id=${id}`;

  const productImage = document.createElement("img");
  productImage.src = producto?.imagen || "assets/regaleria logo.webp";
  productImage.alt = `imagen del producto ${producto?.name || ""}`;

  // Añadir <img> dentro del <a> y luego el <a> dentro del <picture>
  productLink.appendChild(productImage);
  picture.appendChild(productLink);

  // Crear la estructura del título del producto
  const titleContainer = document.createElement("div");
  titleContainer.classList.add("product-title-container");

  const titleLink = document.createElement("a");
  titleLink.href = `./pages/producto.html?id=${id}`;
  titleLink.textContent = producto?.nombre || "null";

  // Añadir el <a> dentro del contenedor del título
  titleContainer.appendChild(titleLink);

  // Crear la estructura del precio del producto
  const priceContainer = document.createElement("div");
  priceContainer.classList.add("product-price-container");

  const price = document.createElement("h3");
  price.textContent = Intl.NumberFormat("es-AR", {style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2}).format(producto?.precio || 0);

  // Añadir el precio al contenedor de precio
  priceContainer.appendChild(price);

  // Crear la estructura del botón de añadir al carrito
  const addToCartContainer = document.createElement("div");
  addToCartContainer.classList.add("product-addtocart-container");

  const addToCartButton = document.createElement("button");
  addToCartButton.alt = "añadir al carrito";
  addToCartButton.addEventListener("click", () => aniadirProdCarrito(id))

  // Svg del boton añadir
  addToCartButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-shopping-bag-plus"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12.5 21h-3.926a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304h11.339a2 2 0 0 1 1.977 2.304l-.263 1.708"/><path d="M16 19h6"/><path d="M19 16v6"/><path d="M9 11v-5a3 3 0 0 1 6 0v5"/></svg>`;

  // Añadir el botón al contenedor
  addToCartContainer.appendChild(addToCartButton);

  // Finalmente, añadir todos los componentes al contenedor principal
  productDOM.appendChild(picture);
  productDOM.appendChild(titleContainer);
  productDOM.appendChild(priceContainer);
  productDOM.appendChild(addToCartContainer);
  return productDOM;
}

function crearTodosProductosEnDOM(productos) { // recibe [ [id, Producto], [id, Producto], ... ]
  const productsContainer = document.getElementById("products-container-main");
  productos.forEach(([id, producto]) => productsContainer.appendChild(crearProductoHTML(producto, id)))
}

function cargarProductoFull(){
  const idProducto = obtenerProductoID()
  if (idProducto && !tienda.gestorProductos.existeID(idProducto))
    return

  const textoDefault = document.getElementById("no-encontrado")
  textoDefault.style.display = "none" // para no mostrar el texto por defecto
  const mainNode = document.querySelector("main")
  mainNode.appendChild(crearProductoFull(tienda.gestorProductos.obtenerPorID(idProducto)))

  const amountToCart = document.getElementById("amount-to-cart");
  const plusToCart = document.getElementById("plus-to-cart");
  const minusToCart = document.getElementById("minus-to-cart");

  plusToCart.addEventListener("click", () => {
    amountToCart.stepUp();
  });

  minusToCart.addEventListener("click", () => {
    amountToCart.stepDown();
  });

  amountToCart.addEventListener("focusout", (event) => {
    const input = event.target;
    if (parseInt(input.value) > parseInt(input.max)) input.value = input.max;
    else if (parseInt(input.value) < parseInt(input.min)) input.value = input.min;
  });
}

function obtenerProductoID() {
  const urlParams = new URLSearchParams(window.location.search);
  return parseInt(urlParams.get('id')); // Obtiene el valor del parámetro "id"
}


function crearProductoFull(producto) {
  const productFullContainer = document.createElement("section");
  productFullContainer.classList.add("product-full-container");
  productFullContainer.innerHTML = `
      <div class="product-full-image-container">
          <img src="${producto.imagen || '../assets/regaleria logo.webp'}" alt="Imagen de ${producto.nombre}">
      </div>
      <div class="product-description">
          <h3>Descripción</h3>
          <p>${producto.descripcion}</p>
      </div>
      <aside class="product-aside">
          <div>
              <h1>${producto.nombre}</h1>
          </div>
          <div class="product-full-precio-container">
              <h3>${Intl.NumberFormat("es-AR", {style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2}).format(producto?.precio || 0)}</h3>
              <h2>${Intl.NumberFormat("es-AR", {style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2}).format(producto?.precioConDescuento() || 0)}</h2>
          </div>
          <div class="product-buy-container">
              <div class="product-full-stock-container">
                  <p>Stock: <span>${producto.stock}</span></p>
              </div>
              <div class="manage-quantity">
                  <button id="minus-to-cart">-</button>
                  <input type="number" min="1" max="${producto.stock}" value="1" id="amount-to-cart">
                  <button id="plus-to-cart">+</button>
              </div>
              <div class="product-addtocart-container full-view">
                  <button alt="añadir al carrito"><span>Añadir al Carrito</span></button>
              </div>
          </div>
      </aside>
  `;
  return productFullContainer;
}

function aniadirProdCarrito(id) {
  if (tienda.ingresarProductoAlCarrito(id))
    alert("Se añadio al carrito");
  else 
    alert("No se pudo añadir el producto al carrito");
}


//main
let tienda = cargarTienda(cargarItems());
const rutaActual = window.location.pathname;

// Verificar la ruta actual
if (rutaActual === '/' || rutaActual === '/index.html' || rutaActual === "/#") {
  crearTodosProductosEnDOM(tienda.obtenerTodosLosProductosConIDs())
} else if (rutaActual === '/pages/product.html') {
  cargarProductoFull()
}


