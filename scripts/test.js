
class Producto {
  constructor(nombre = "", descripcion = "", precio = 0, stock = 0, descuento = 0, imagen = "") {
    Object.assign(this, { nombre, descripcion, precio, stock, descuento, imagen });
  }

  operarStock(cantidad) {
    const nuevoStock = this.stock + cantidad;
    //no se le puede restar mas de lo que hay de stock, siempre tendra un valor positivo o 0
    if (nuevoStock < 0)
      return -1;
    this.stock = nuevoStock;
    return this.stock;
  }

  precioConDescuento() {
    if (this.descuento <= 0) return this.precio;
    return this.precio * ((100 - this.descuento) / 100);
  }

  static parsearProductoDeJSON(producto) {
    return Object.assign(new Producto(), producto);
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

  parsearYAniadirProducto(producto = { nombre: "", descripcion: "", precio: 0, stock: 0, descuento: 0, imagen: "" }, stockLocalStorage) {
    // debugger
    const productoFinal = Producto.parsearProductoDeJSON(producto);
    const id = this.aniadir(productoFinal);
    const stockActualizado = stockLocalStorage.get(id);
    if (!isNaN(stockActualizado) && stockActualizado >= 0) {
      productoFinal.stock = stockActualizado;
      this.actualizarProducto(id, productoFinal);
    }
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

  modificacionValida(id, cantidad) {
    let { stock } = this.obtenerPorID(id);
    return stock + cantidad >= 0;
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

  parsearCategoriasYSubcategorias(item, gestorCategorias, gestorProductos) { //item = {categoria:"", subcategorias: [ {categoria:"", productos: []} ]}
    // debugger
    let categoriaPrincipal = new Categoria(item.categoria);
    if (this.subcategorias.has(categoriaPrincipal)) return false;
    const stockDeProductosLocalStorage = new Map(JSON.parse(localStorage.getItem("regaleria-productos-actualizados")) || [])

    gestorCategorias.aniadirCategoria(categoriaPrincipal);
    for (let { categoria, productos } of item.subcategorias) {
      const subcat = new Categoria(categoria);
      gestorCategorias.aniadirCategoria(subcat);
      this.nuevasSubcategoriasParaCategoria(categoriaPrincipal, subcat);
      for (let prodJSON of productos) {
        const prod = gestorProductos.parsearYAniadirProducto(prodJSON, stockDeProductosLocalStorage);
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

  obtenerTodasCategoriasConProductos(gestorProductos) {
    let categorias = [];
    for (let [categoria, subcategorias] of this.obtenerTodasSubcategorias()) {
      const cat = {
        nombre: categoria.nombre,
        subCategorias: Array.from(subcategorias).map(subCat => {
          const productos = this.obtenerProductos(subCat);
          return {
            nombre: subCat.nombre,
            productos: productos.map(prod => {
              prod.id = gestorProductos.obtenerID(prod)
              return prod;
            })
          };
        })
      };
      categorias.push(cat);
    }
    return categorias; // el resultado final es [ { nombre (de categoria), subCategorias: [ { nombre (de la subcategoria), productos: [ producto, ... ] }, ... ] }, ... ]
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
    if (nuevaCantidad === 1) {
      const prodList = document.querySelector(".lista-carrito")
      prodList.appendChild(productoCarrito(id, cantidad))
    }
    actualizarIndicadorCarrito()
    return nuevaCantidad;
  }

  setearCantidad(id, cantidad, gestorProductos = new GestorProductos()) {
    const producto = gestorProductos.obtenerPorID(id);
    if (!producto || cantidad <= 0) return false;
    this.itemsCarrito.set(id, Math.min(cantidad >= 0 ? cantidad : 1, producto.stock))
    this.actualizarCarrito();
  }

  removerProducto(id, cantidad = 1) {
    const cantidadActual = this.itemsCarrito.get(id) || 0;
    if (cantidad < 1) return cantidadActual;
    const nuevaCantidad = Math.max(cantidadActual - cantidad, 0);
    if (!nuevaCantidad) this.itemsCarrito.delete(id);
    else this.itemsCarrito.set(id, nuevaCantidad);
    this.actualizarCarrito();
    return nuevaCantidad;
  }

  #calcularPrecio([id, cantidad], acc, gestorProductos) {
    return gestorProductos.obtenerPorID(id).precioConDescuento().toFixed(2) * cantidad + acc;
  }

  calcularPrecioFinal(gestorProductos = new GestorProductos()) {
    return [...this.itemsCarrito.entries()].reduce((acc, item) => this.#calcularPrecio(item, acc, gestorProductos), 0).toFixed(2);
  }

  #itemizar([id, cantidad], gestorProductos) {
    return { id: id, producto: gestorProductos.obtenerPorID(id), cantidad: cantidad };
  }

  obtenerCarrito(gestorProductos = new GestorProductos()) {
    return [...this.itemsCarrito].map((value) => this.#itemizar(value, gestorProductos));
  }

  obtenerTotalItems() {
    return this.itemsCarrito.size
  }

  obtenerCantidadItem(id) {
    return this.itemsCarrito.get(id)
  }

  actualizarCarrito() {
    localStorage.setItem("regaleria-carrito", JSON.stringify([...this.itemsCarrito.entries()]));
  }

  cargarFullCarrito() {
    const listaCarrito = document.querySelector(".lista-carrito")
    listaCarrito.innerHTML = "";
    if (this.obtenerTotalItems() === 0)
      return;

    this.itemsCarrito.entries().forEach(([id, cantidad]) => {
      listaCarrito.appendChild(productoCarrito(id, cantidad))
    })
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

  obtenerCategoriasConProductos() {
    return this.gestorRelaciones.obtenerTodasCategoriasConProductos(this.gestorProductos);
  }

  obtenerTodasLasRelaciones() {
    return this.gestorRelaciones.obtenerRelaciones();
  }

  obtenerCarrito() {
    return this.carrito.obtenerCarrito(this.gestorProductos);
  }

  obtenerCantidadCarrito() {
    return this.carrito.obtenerTotalItems();
  }

  obtenerCantidadItemCarrito(id) {
    return this.carrito.obtenerCantidadItem(id);
  }

  obtenerPrecioFinal() {
    return this.carrito.calcularPrecioFinal();
  }

  ingresarProductoAlCarrito(id, cantidad) {
    return this.carrito.aniadirProducto(id, cantidad, this.gestorProductos)
  }

  vaciarCarrito() {
    if (this.carrito.obtenerTotalItems() === 0)
      return;
    
    this.carrito.itemsCarrito.clear();
    this.carrito.actualizarCarrito();
    actualizarCarritoDOM()
    actualizarIndicadorCarrito()
    abrirCerrarCarrito()
    Toastify({
      text: "Carrito vaciado",
      gravity: "top",
      position: "center",
      style: {
        background: "linear-gradient(to right, #357DED, #5603FF)",
      }
    }).showToast();
  }

  finalizarCompra() {
    if (!this.#compraValida()) return false;
    let productoIDConStock = Array.from(this.carrito.itemsCarrito.keys()).map(id => {
      return {id: id, stock: this.gestorProductos.obtenerPorID(id).stock }
    });

    this.#modificarStockLocalStorage(productoIDConStock);
    this.carrito.itemsCarrito.clear();
    this.carrito.actualizarCarrito();
    actualizarCarritoDOM()
    actualizarIndicadorCarrito()
    return true;
  }

  #compraValida() {
    const idProductosCarrito = Array.from(this.carrito.itemsCarrito.entries())
    let compraValida = idProductosCarrito.every(([id, cantidad]) => 
      this.gestorProductos.modificacionValida(id, cantidad * -1)); // se multiplica por -1 a cantidad por que se está restando la cantidad al stock (modificarStock() soporta suma y resta)
    
    if (compraValida)
      idProductosCarrito.forEach(([id, cantidad]) => this.gestorProductos.modificarStock(id, cantidad * -1))
    return compraValida
  }

  #modificarStockLocalStorage(productos) { // productos = [{id: 0, stock: 0},...]
    const productosLocalStorage = new Map(JSON.parse(localStorage.getItem("regaleria-productos")) || [])
    productos.forEach(({ id, stock }) => productosLocalStorage.set(id, stock))
    localStorage.setItem("regaleria-productos-actualizados", JSON.stringify(Array.from(productosLocalStorage)))
  }
}

async function cargarItems() {
  try {
    const respuesta = await fetch("./data/productos.json");
    if (!respuesta.ok) throw new Error(`Error al cargar el JSON: ${respuesta.statusText}`);
    return await respuesta.json();
  } catch (error) {
    console.error("Error al obtener los datos del JSON:", error);
  }
}

function cargarTienda(items) {
  let gestorCategorias = new GestorCategorias();
  let gestorRelaciones = new GestorRelaciones();
  let gestorProductos = new GestorProductos();
  items.forEach((item) => gestorRelaciones.parsearCategoriasYSubcategorias(item, gestorCategorias, gestorProductos));
  const itemsCarrito = localStorage.getItem("regaleria-carrito");
  const carrito = itemsCarrito ? new Carrito(new Map(JSON.parse(itemsCarrito))) : new Carrito();
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
  titleLink.href = `./pages/product.html?id=${id}`;
  titleLink.textContent = producto?.nombre || "null";

  // Añadir el <a> dentro del contenedor del título
  titleContainer.appendChild(titleLink);

  // Crear la estructura del precio del producto
  const priceContainer = document.createElement("div");
  priceContainer.classList.add("product-price-container");

  if (producto?.descuento) {
    const containerDescuento = document.createElement("div")
    containerDescuento.classList.add("product-full-precio-container")
    containerDescuento.innerHTML = `<h3>${formatearPrecio(producto?.precio)}</h3><span>% ${Math.round(producto.descuento)}</span>`
    priceContainer.appendChild(containerDescuento)
  }

  const price = document.createElement("h2");
  price.textContent = formatearPrecio(producto.precioConDescuento());

  // Añadir el precio al contenedor de precio
  priceContainer.appendChild(price);

  // Crear la estructura del botón de añadir al carrito
  const addToCartContainer = document.createElement("div");
  addToCartContainer.classList.add("product-addtocart-container");

  const addToCartButton = document.createElement("button");
  addToCartButton.alt = "añadir al carrito";
  addToCartButton.addEventListener("click", () => {
    aniadirProdCarrito(id, 1, `Se añadio: ${producto?.nombre} al carrito`)
    actualizarCarritoDOM()
  })

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

function formatearPrecio(precio = 0) {
  return Intl.NumberFormat("es-AR", {style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2}).format(precio);
}

function crearTodasLasCategoriasConProductosEnDOM(categoriasConProductos) {
  const productsContainer = document.getElementById("products-container-main");
  categoriasConProductos.forEach(cat => crearCategoriaConProductos(cat, productsContainer))
}

function crearCategoriaConProductos(categoria, productsContainer) { // categoria = [ { nombre, subCategorias: [ { nombre, productos: [ producto, ... ] }, ... ] }, ... ]
  if (!categoria?.subCategorias) return;

  const { nombre, subCategorias } = categoria;
  const categoriaDOM = document.createElement("div");
  categoriaDOM.classList.add("category-container")
  const categoriaTitle = document.createElement("h2")
  categoriaTitle.textContent = nombre
  categoriaTitle.classList.add("category-title")
  categoriaDOM.appendChild(categoriaTitle)

  const subcategoryContainer = document.createElement("div")
  subcategoryContainer.classList.add("subcategory-container")
  subCategorias.forEach(subCat => {
    const subcategoryDOM = document.createElement("h3")
    subcategoryDOM.textContent = subCat.nombre
    subcategoryDOM.classList.add("subcategory-title")
    subcategoryContainer.appendChild(subcategoryDOM)
    const productsContainer = document.createElement("div")
    productsContainer.classList.add("products-container")
    subCat.productos.forEach(prod => productsContainer.appendChild(crearProductoHTML(prod, prod.id)))
    subcategoryContainer.appendChild(productsContainer)
  })
  categoriaDOM.appendChild(subcategoryContainer)
  productsContainer.appendChild(categoriaDOM);
}

function cargarProductoFull(){
  const idProducto = obtenerProductoIDdeURI()
  if (isNaN(idProducto) || !tienda.gestorProductos.existeID(idProducto))
    return

  const producto = tienda.gestorProductos.obtenerPorID(idProducto);
  const textoDefault = document.getElementById("no-encontrado")
  textoDefault.remove()
  const mainNode = document.querySelector("main")
  mainNode.appendChild(crearProductoFull(producto))

  const amountToCart = document.getElementById("amount-to-cart");
  const plusToCart = document.getElementById("plus-to-cart");
  const minusToCart = document.getElementById("minus-to-cart");

  plusToCart.addEventListener("click", () => amountToCart.stepUp());
  minusToCart.addEventListener("click", () => amountToCart.stepDown());

  amountToCart.addEventListener("focusout", (event) => {
    const input = event.target;
    input.value = Math.max(1, Math.min(parseInt(input.value) || 1, producto.stock))
  });

  const addToCart = document.getElementById("add-to-cart-button")
  addToCart.addEventListener("click", () => {
    const cantidad = parseInt(amountToCart.value)
    const mensaje = `Se ${cantidad > 1 ? `añadieron ${cantidad}` : "añadio"}: ${producto.nombre} al carrito`
    aniadirProdCarrito(idProducto, cantidad, mensaje)
    actualizarCarritoDOM()
  })
}

function obtenerProductoIDdeURI() {
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
              ${producto?.descuento ? `<h3>${formatearPrecio(producto?.precio)}</h3><span>% ${Math.round(producto.descuento)}</span>` : ""}
              <h2>${formatearPrecio(producto.precioConDescuento())}</h2>
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
                  <button alt="añadir al carrito" id="add-to-cart-button"><span>Añadir al Carrito</span></button>
              </div>
          </div>
      </aside>
  `;
  return productFullContainer;
}

function aniadirProdCarrito(id, cantidad = 1, mensaje = "Se añadio al carrito") {
  const exito = tienda.ingresarProductoAlCarrito(id, cantidad)
  const cantidadEnCarrito = tienda.obtenerCantidadItemCarrito(id)
  let textoMensaje, duracion, estiloFondo;
  
  if (exito) {
    textoMensaje = `${mensaje}\nCantidad en carrito: ${cantidadEnCarrito}`;
    duracion = 3000;
    estiloFondo = "linear-gradient(to right, green, rgb(0, 180, 0))";
  } else {
    textoMensaje = `No hay suficiente stock de este producto${cantidadEnCarrito ? "\nCantidad en carrito: " + cantidadEnCarrito : ""}`;
    duracion = 5000;
    estiloFondo = "linear-gradient(to right, rgb(255, 120, 0), red)";
  }
  
  Toastify({
    text: textoMensaje,
    duration: duracion,
    stopOnFocus: true,
    position: "center",
    style: {
      textAlign: "center",
      background: estiloFondo,
    }
  }).showToast();
}

function indicarItemsCarrito(cantidadItems){
  const cantidadCarrito = document.getElementById("cart-amount-items")
  if (cantidadItems) {
    cantidadCarrito.innerText = cantidadItems > 99 ? "+99" : cantidadItems
    cantidadCarrito.style.display = "flex"
  } else
    cantidadCarrito.style.display = "none"
}

function actualizarIndicadorCarrito(){
  indicarItemsCarrito(tienda.obtenerCantidadCarrito())
}

function actualizarCarritoDOM() {
  tienda.carrito.cargarFullCarrito()
  actualizarPrecioFinal()
}

//main
let items = await cargarItems();
let tienda = cargarTienda(items);
actualizarIndicadorCarrito()
tienda.carrito.cargarFullCarrito()
const rutaActual = window.location.pathname;
// Verificar la ruta actual
const validURL = rutaActual === '/' || rutaActual === '/index.html' || rutaActual === "/#" || rutaActual === "/JavaScript-Course/" || rutaActual === "/JavaScript-Course/#"
if (validURL) {
  crearTodasLasCategoriasConProductosEnDOM(tienda.obtenerCategoriasConProductos());
} else if (rutaActual === '/pages/product.html' || rutaActual === '/JavaScript-Course/pages/product.html') {
  cargarProductoFull()
}

const iconoCarrito = document.getElementById("cart-container");
iconoCarrito.addEventListener("click", () => abrirCerrarCarrito())
const botonCerrarCarro = document.getElementById("close-cart")
botonCerrarCarro.addEventListener("click", () => abrirCerrarCarrito())

function abrirCerrarCarrito() {
  const body = document.body;
  actualizarPrecioFinal()
  body.classList.toggle("open-cart")
  // desabilitarBotones(containerBotones)
}

const clearCart = document.getElementById("clear-cart")
clearCart.addEventListener("click", () => {
  tienda.vaciarCarrito()
})

const containerBotones = document.getElementsByClassName("product-addtocart-container")
function desabilitarBotones(divs) {
  const addToCart = document.getElementById("add-to-cart-button")
  if (addToCart)
    addToCart.disabled = !addToCart.disabled;
  for (let div of divs)
    div.lastChild.disabled = !div.lastChild.disabled;
}

function productoCarrito(id, cantidad) {
  const producto = tienda.gestorProductos.obtenerPorID(id);
  const precioUnitario = producto.precioConDescuento().toFixed(2);
  
  const prodCarrito = document.createElement("div");
  prodCarrito.classList.add("item-carrito");
  prodCarrito.id = `p-${id}`;
  
  prodCarrito.innerHTML = `
    <div class="nombre-prod">${producto.nombre}</div>
      <div class="cantidad-prod manage-quantity"></div>
      <div class="precio-prod">${formatearPrecio(precioUnitario)}</div>
    <div class="subtotal-item">${formatearPrecio(precioUnitario * cantidad)}</div>
  `;

  const cantidadCont = prodCarrito.querySelector(".cantidad-prod");
  const subTotalElem = prodCarrito.querySelector(".subtotal-item");
  
  const totalItems = crearInputCantidad(id, cantidad, producto.stock, subTotalElem, precioUnitario);
  const menos = crearBotonMenos(id, totalItems, subTotalElem, precioUnitario);
  const mas = crearBotonMas(id, totalItems, subTotalElem, precioUnitario);
  
  cantidadCont.append(menos, totalItems, mas);
  return prodCarrito;
}

function crearInputCantidad(id, cantidad, maxStock, subTotalElem, precioUnitario) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = maxStock;
  input.value = cantidad;
  
  input.addEventListener("focusout", (event) => {
    let newCantidad = Math.max(1, Math.min(parseInt(event.target.value || tienda.carrito.obtenerCantidadItem(id)) || 1, maxStock));
    event.target.value = newCantidad;
    tienda.carrito.setearCantidad(id, newCantidad, tienda.gestorProductos);
    actualizarElementos(newCantidad, subTotalElem, precioUnitario);
  });
  
  return input;
}

function crearBotonMenos(id, inputElem, subTotalElem, precioUnitario) {
  const boton = document.createElement("button");
  boton.innerHTML = inputElem.value === "1" ? 
    `<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="1.5"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-shopping-bag-minus"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12.5 21h-3.926a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304h11.339a2 2 0 0 1 1.977 2.304l-.73 4.744" /><path d="M9 11v-5a3 3 0 0 1 6 0v5" /><path d="M16 19h6" /></svg>` 
    : `<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-minus"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0" /></svg>`;
  boton.style.color = inputElem.value === "1" ? "red" : "";
  
  boton.addEventListener("click", () => {
    inputElem.stepDown();
    let newValue = parseInt(inputElem.value);
    if (newValue === 0) {
      tienda.carrito.removerProducto(id);
      inputElem.closest(".item-carrito").remove();
      actualizarCarritoDOM();
      actualizarIndicadorCarrito();
    } else {
      tienda.carrito.removerProducto(id);
      actualizarElementos(newValue, subTotalElem, precioUnitario);
    }
  });
  
  return boton;
}

function crearBotonMas(id, inputElem, subTotalElem, precioUnitario) {
  const boton = document.createElement("button");
  boton.classList.add("aniadir");
  boton.innerHTML = `<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-plus"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>`;
  
  boton.addEventListener("click", () => {
    inputElem.stepUp();
    let newValue = parseInt(inputElem.value);
    tienda.carrito.aniadirProducto(id, 1, tienda.gestorProductos);
    actualizarElementos(newValue, subTotalElem, precioUnitario);
  });
  
  return boton;
}

function actualizarElementos(cantidad, subTotalElem, precioUnitario) {
  const menosBoton = subTotalElem.parentElement.querySelector("button");
  menosBoton.innerHTML= cantidad === 1 ? 
    `<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="1.5"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-shopping-bag-minus"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12.5 21h-3.926a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304h11.339a2 2 0 0 1 1.977 2.304l-.73 4.744" /><path d="M9 11v-5a3 3 0 0 1 6 0v5" /><path d="M16 19h6" /></svg>`
    : `<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-minus"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0" /></svg>`;
  menosBoton.style.color = cantidad === 1 ? "red" : "";
  subTotalElem.innerText = formatearPrecio(precioUnitario * cantidad);
  actualizarPrecioFinal();
}

const precioFinalDOM = document.getElementById("precio-final")
function actualizarPrecioFinal() {
  precioFinalDOM.innerText = formatearPrecio(tienda.carrito.calcularPrecioFinal(tienda.gestorProductos))
}

const finalCompra = document.getElementById("finalizar-compra")
const modalFinalCompra = document.getElementById("finalize-purchase-modal")
const closeModalList = document.getElementsByClassName("close-modal")

modalFinalCompra.addEventListener("cancel", () => closeModal())
finalCompra.addEventListener("click", () => tienda.obtenerCantidadCarrito() && abrirModal())
Array.from(closeModalList).forEach(boton => boton.addEventListener("click", () => closeModal()));

function closeModal() {
  abrirCerrarCarrito()
  modalFinalCompra.classList.add("modal-open")
  setTimeout(() => {
    modalFinalCompra.style.display = "none"
    modalFinalCompra.close()
  }, 400);
}

function abrirModal(){
  cargarTablaFinalCompra()
  abrirCerrarCarrito()
  modalFinalCompra.style.display = "flex"
  modalFinalCompra.showModal()
  modalFinalCompra.classList.remove('modal-open');
}

function cargarTablaFinalCompra() {
  const tableBody = document.querySelector("tbody")
  tableBody.innerHTML = ""
  let finalPrice = 0;
  tienda.obtenerCarrito().forEach(({producto, cantidad}) => {
    finalPrice += producto.precioConDescuento().toFixed(2) * cantidad;
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${producto.nombre}</td>
      <td>${cantidad}</td>
      <td>${formatearPrecio(producto.precioConDescuento().toFixed(2))}</td>
      <td>${formatearPrecio(producto.precioConDescuento().toFixed(2) * cantidad)}</td>
    `
    tableBody.appendChild(row)
  })
  const totalRow = document.getElementById("total-purchase")
  totalRow.innerText = formatearPrecio(finalPrice);
}

const confirmPurchase = document.getElementById("confirm-purchase")
confirmPurchase.addEventListener("click", () => {
  if (tienda.finalizarCompra()) {
    modalFinalCompra.close()
    modalFinalCompra.style.display = "none"
    Toastify({
      text: "Compra realizada con éxito",
      duration: 6000,
      stopOnFocus: true,
      position: "center",
      style: {
        textAlign: "center",
        background: "linear-gradient(to right, green, rgb(0, 180, 0))",
      }
    }).showToast();
  } else {
    Toastify({
      text: "No se pudo realizar la compra",
      duration: 6000,
      stopOnFocus: true,
      position: "center",
      style: {
        textAlign: "center",
        background: "linear-gradient(to right, rgb(255, 120, 0), red)",
      }
    }).showToast();
  }
})



