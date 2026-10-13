import { PrismaService } from '../prisma/prisma.service';
import { CmsService } from './cms.service';

describe('CmsService', () => {
  const findUnique = jest.fn();
  const create = jest.fn();
  const prisma = {
    siteSettings: { findUnique, create },
  } as unknown as PrismaService;
  let service: CmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CmsService(prisma);
  });

  it('returns the official WhatsApp number in newly created public settings', async () => {
    findUnique.mockResolvedValue(null);
    create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'settings', ...data }),
    );

    await expect(service.getSiteSettings()).resolves.toMatchObject({
      whatsappNumber: '09026595713',
      contactPhone: '',
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        singletonKey: 'default',
        whatsappNumber: '09026595713',
        contactPhone: '',
      }),
    });
  });

  it('returns existing CMS settings unchanged', async () => {
    const settings = { id: 'settings', whatsappNumber: '08000000000' };
    findUnique.mockResolvedValue(settings);

    await expect(service.getSiteSettings()).resolves.toBe(settings);
    expect(create).not.toHaveBeenCalled();
  });
});
