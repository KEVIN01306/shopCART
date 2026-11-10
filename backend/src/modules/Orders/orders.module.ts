import { getPool } from "@infrastructure/config/mssql.config.js";
import { MssqlOrdersRepository } from "./infrastructure/mssql-orders.repository.js";
import {
    CreateAddressUseCase,
    DeleteAddressUseCase,
    ListAddressesUseCase,
} from "./application/addresses.usecases.js";
import { ReserveCheckoutUseCase } from "./application/reserve-checkout.usecase.js";
import { CreateOrderUseCase } from "./application/create-order.usecase.js";
import { ListOrdersUseCase } from "./application/list-orders.usecase.js";
import { GetOrderUseCase } from "./application/get-order.usecase.js";
import { UpdateOrderStatusUseCase } from "./application/update-order-status.usecase.js";
import { CancelOrderUseCase } from "./application/cancel-order.usecase.js";
import { ProcessOrderReturnUseCase } from "./application/process-order-return.usecase.js";
import { OrdersController } from "./presentation/orders.controller.js";

export const ordersRepository = new MssqlOrdersRepository(getPool);

export const listAddressesUseCase = new ListAddressesUseCase(ordersRepository);
export const createAddressUseCase = new CreateAddressUseCase(ordersRepository);
export const deleteAddressUseCase = new DeleteAddressUseCase(ordersRepository);
export const reserveCheckoutUseCase = new ReserveCheckoutUseCase(
    ordersRepository
);
export const createOrderUseCase = new CreateOrderUseCase(ordersRepository);
export const listOrdersUseCase = new ListOrdersUseCase(ordersRepository);
export const getOrderUseCase = new GetOrderUseCase(ordersRepository);
export const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(
    ordersRepository
);
export const cancelOrderUseCase = new CancelOrderUseCase(ordersRepository);
export const processOrderReturnUseCase = new ProcessOrderReturnUseCase(
    ordersRepository
);

export const ordersController = new OrdersController(
    listAddressesUseCase,
    createAddressUseCase,
    deleteAddressUseCase,
    reserveCheckoutUseCase,
    createOrderUseCase,
    listOrdersUseCase,
    getOrderUseCase,
    updateOrderStatusUseCase,
    cancelOrderUseCase,
    processOrderReturnUseCase
);
